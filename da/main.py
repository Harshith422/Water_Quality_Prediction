import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, expr, when, sum as sum_, lit, coalesce
from pyspark.ml.feature import StringIndexer, VectorAssembler, StandardScaler
from pyspark.ml.classification import GBTClassifier

# Initialize Spark with S3 configuration
os.environ["JAVA_HOME"] = "/usr/lib/jvm/java-8-openjdk-amd64"
spark = SparkSession.builder \
    .appName("AirlineDelayPreprocess") \
    .config("spark.driver.memory", "6g") \
    .config("spark.executor.memory", "4g") \
    .config("spark.jars", "/usr/local/lib/python3.11/dist-packages/pyspark/jars/hadoop-aws-3.3.4.jar,/usr/local/lib/python3.11/dist-packages/pyspark/jars/aws-java-sdk-bundle-1.12.262.jar") \
    .config("spark.hadoop.fs.s3a.access.key", os.environ.get("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .getOrCreate()

# Load data from S3
data_path = "s3a://videostreamingserviceamrita/datasets/Airline_Delay_Cause.csv"
df = spark.read.csv(data_path, header=True, inferSchema=True)

# Clean data
df = df.dropna(subset=["arr_flights", "arr_del15", "carrier", "airport"]) \
       .filter(col("arr_flights") > 0)
df = df.withColumn("carrier", coalesce(col("carrier"), lit("Unknown")))
df = df.withColumn("airport", coalesce(col("airport"), lit("Unknown")))
print(f"Rows after cleaning: {df.count()}")

# Reduce airport cardinality
airport_counts = df.groupBy("airport").agg(sum_("arr_flights").alias("total_flights"))
top_airports = airport_counts.orderBy(col("total_flights").desc()).limit(30).select("airport")
df = df.join(top_airports.withColumnRenamed("airport", "top_airport"),
             df.airport == col("top_airport"), "left_outer")
df = df.withColumn("airport", when(col("top_airport").isNull(), "Other").otherwise(col("airport")))
df = df.drop("top_airport")
unique_airports = df.select("airport").distinct().count()
print(f"Unique airports after grouping: {unique_airports}")
if unique_airports > 31:
    print("Warning: Airport grouping may not have reduced cardinality. Check airport values:")
    df.select("airport").distinct().show(truncate=False)

# Calculate delay rate and label
df = df.withColumn("delay_rate", col("arr_del15") / col("arr_flights"))
df = df.withColumn("delay_label", when(col("delay_rate") > 0.25, 1).otherwise(0))

# Feature engineering
df = df.withColumn("month_sin", expr("sin(2 * pi() * month / 12)"))
df = df.withColumn("month_cos", expr("cos(2 * pi() * month / 12)"))
df = df.withColumn("carrier_prop", col("carrier_ct") / col("arr_del15"))
df = df.withColumn("weather_prop", col("weather_ct") / col("arr_del15"))
df = df.withColumn("nas_prop", col("nas_ct") / col("arr_del15"))
df = df.withColumn("late_aircraft_prop", col("late_aircraft_ct") / col("arr_del15"))
df = df.fillna({"carrier_prop": 0, "weather_prop": 0, "nas_prop": 0, "late_aircraft_prop": 0})

# Add interaction term
df = df.withColumn("carrier_airport_interaction",
                   coalesce(col("carrier").cast("string") + "_" + col("airport"), lit("Unknown_Unknown")))

# Indexing with handleInvalid
carrier_indexer = StringIndexer(inputCol="carrier", outputCol="carrier_index", handleInvalid="keep")
airport_indexer = StringIndexer(inputCol="airport", outputCol="airport_index", handleInvalid="keep")
interaction_indexer = StringIndexer(inputCol="carrier_airport_interaction",
                                    outputCol="interaction_index", handleInvalid="keep")
carrier_indexer_model = carrier_indexer.fit(df)
airport_indexer_model = airport_indexer.fit(df)
interaction_indexer_model = interaction_indexer.fit(df)
df = carrier_indexer_model.transform(df)
df = airport_indexer_model.transform(df)
df = interaction_indexer_model.transform(df)

# Normalize arr_flights
assembler_temp = VectorAssembler(inputCols=["arr_flights"], outputCol="arr_flights_vec")
df = assembler_temp.transform(df)
scaler = StandardScaler(inputCol="arr_flights_vec", outputCol="arr_flights_scaled")
scaler_model = scaler.fit(df)
df = scaler_model.transform(df)

# Assemble features
features = [
    "year", "month_sin", "month_cos", "carrier_index", "airport_index",
    "interaction_index", "arr_flights_scaled", "carrier_prop", "weather_prop",
    "nas_prop", "late_aircraft_prop"
]
assembler = VectorAssembler(inputCols=features, outputCol="features", handleInvalid="skip")
df = assembler.transform(df)

# Handle class imbalance
class_counts = df.groupBy("delay_label").count().collect()
total = sum([row["count"] for row in class_counts])
weights = {row["delay_label"]: total / (2 * row["count"]) for row in class_counts}
print(f"Class weights: {weights}")
df = df.withColumn(
    "weight",
    when(col("delay_label") == 0, lit(weights.get(0.0, 1.0)))
    .when(col("delay_label") == 1, lit(weights.get(1.0, 1.0)))
    .otherwise(lit(1.0))
)

# Split data
train_df, test_df = df.randomSplit([0.8, 0.2], seed=42)

# Train model (GBTClassifier)
gbt = GBTClassifier(
    labelCol="delay_label",
    featuresCol="features",
    weightCol="weight",
    maxIter=50,
    maxDepth=10,
    maxBins=100,
    seed=42
)
model = gbt.fit(train_df)

# Save model and data to S3
model.write().overwrite().save("s3a://videostreamingserviceamrita/models/gbt_model_improved")
test_df.write.mode("overwrite").parquet("s3a://videostreamingserviceamrita/data/test_data.parquet")
carrier_indexer_model.write().overwrite().save("s3a://videostreamingserviceamrita/models/carrier_indexer")
airport_indexer_model.write().overwrite().save("s3a://videostreamingserviceamrita/models/airport_indexer")
interaction_indexer_model.write().overwrite().save("s3a://videostreamingserviceamrita/models/interaction_indexer")
scaler_model.write().overwrite().save("s3a://videostreamingserviceamrita/models/scaler")

spark.stop()
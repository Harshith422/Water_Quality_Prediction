import os
import pandas as pd
import logging
import sys
import findspark
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import tempfile
import subprocess

# Load environment variables from .env file if it exists
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Set up Spark environment
def setup_spark_env():
    try:
        # For Windows, we need to handle Java_HOME differently
        if os.name == 'nt':  # Windows
            # Try to find JAVA_HOME or use a default Windows Java location
            java_home = os.environ.get("JAVA_HOME")
            
            # Check if Java version is too new (Java 17+)
            if java_home and "jdk-24" in java_home:
                logger.warning(f"Java 24 detected at {java_home}. This version may cause compatibility issues with PySpark.")
                logger.warning("Consider using Java 8 or 11 for better compatibility.")
                
                # Create a temporary Java options file for Spark
                with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False) as f:
                    f.write("""
                    [config]
                    java.security.manager=allow
                    spark.driver.extraJavaOptions=-Djava.security.manager=allow
                    spark.executor.extraJavaOptions=-Djava.security.manager=allow
                    """)
                    spark_conf_file = f.name
                
                # Set environment variables
                os.environ["JAVA_HOME"] = java_home
                os.environ["PYSPARK_PYTHON"] = sys.executable
                os.environ["SPARK_CONF_FILE"] = spark_conf_file
                os.environ["SPARK_SUBMIT_OPTS"] = "-Djava.security.manager=allow"
            else:
                os.environ["JAVA_HOME"] = java_home
            
            logger.info(f"Using JAVA_HOME: {java_home}")
        else:
            os.environ["JAVA_HOME"] = "/usr/lib/jvm/java-8-openjdk-amd64"
            
        # Print AWS credentials mask for debugging (only first few characters)
        aws_key = os.environ.get("AWS_ACCESS_KEY_ID", "")
        aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
        logger.info(f"AWS Key: {aws_key[:4]}{'*' * (len(aws_key) - 4) if len(aws_key) > 4 else 'Not set'}")
        logger.info(f"AWS Secret: {'*' * 8}{aws_secret[-4:] if len(aws_secret) > 4 else 'Not set'}")
        
        # Initialize findspark to locate Spark installation
        findspark.init()
        
        logger.info("Spark environment configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to setup Spark environment: {str(e)}")
        return False

# Initialize Spark session
def initialize_spark():
    try:
        # Import PySpark after environment setup
        from pyspark.sql import SparkSession
        
        # Build Spark session with additional configuration
        spark_builder = SparkSession.builder \
            .appName("AirlineDelayPredict") \
            .config("spark.driver.memory", "4g") \
            .config("spark.jars.packages", "org.apache.hadoop:hadoop-aws:3.3.1,org.apache.hadoop:hadoop-common:3.3.1") \
            .config("spark.hadoop.fs.s3a.access.key", os.environ.get("AWS_ACCESS_KEY_ID")) \
            .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("AWS_SECRET_ACCESS_KEY")) \
            .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
            .config("spark.hadoop.fs.s3a.path.style.access", "true") \
            .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
            .config("spark.driver.extraJavaOptions", "-Djava.security.manager=allow") \
            .config("spark.executor.extraJavaOptions", "-Djava.security.manager=allow")
        
        # Create the Spark session
        spark = spark_builder.getOrCreate()
        
        logger.info("Spark session initialized successfully")
        return spark
    except Exception as e:
        logger.error(f"Failed to initialize Spark: {str(e)}")
        raise
# Load models from S3
def load_models(spark):
    try:
        # Import after Spark initialization
        from pyspark.sql.functions import col, expr, lit, coalesce
        from pyspark.ml.feature import StringIndexerModel, VectorAssembler, StandardScalerModel
        from pyspark.ml.classification import GBTClassificationModel
        
        logger.info("Loading models from S3...")
        # Test S3 connection with configuration
        spark._jsc.hadoopConfiguration().set("fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        
        # Load all models
        model = GBTClassificationModel.load("s3a://videostreamingserviceamrita/models/gbt_model_improved")
        carrier_indexer = StringIndexerModel.load("s3a://videostreamingserviceamrita/models/carrier_indexer")
        airport_indexer = StringIndexerModel.load("s3a://videostreamingserviceamrita/models/airport_indexer")
        interaction_indexer = StringIndexerModel.load("s3a://videostreamingserviceamrita/models/interaction_indexer")
        scaler = StandardScalerModel.load("s3a://videostreamingserviceamrita/models/scaler")
        
        logger.info("Models loaded successfully")
        return model, carrier_indexer, airport_indexer, interaction_indexer, scaler
    except Exception as e:
        logger.error(f"Failed to load models: {str(e)}")
        raise

# Create a schema for input data
def create_schema():
    from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType
    
    schema = StructType([
        StructField("year", IntegerType(), True),
        StructField("month", IntegerType(), True),
        StructField("carrier", StringType(), True),
        StructField("airport", StringType(), True),
        StructField("arr_flights", IntegerType(), True),
        StructField("carrier_ct", IntegerType(), True),
        StructField("weather_ct", IntegerType(), True),
        StructField("nas_ct", IntegerType(), True),
        StructField("late_aircraft_ct", IntegerType(), True),
        StructField("arr_del15", IntegerType(), True)
    ])
    return schema

# Process input data and make prediction
def predict_delay(input_data, spark, models):
    try:
        from pyspark.sql.functions import col, expr, lit, coalesce
        from pyspark.ml.feature import VectorAssembler
        
        logger.info(f"Processing input data: {input_data}")
        
        # Unpack models
        model, carrier_indexer, airport_indexer, interaction_indexer, scaler = models
        
        # Convert input to DataFrame
        schema = create_schema()
        input_df = spark.createDataFrame([input_data], schema)
        
        # Feature engineering
        input_df = input_df.withColumn("month_sin", expr("sin(2 * pi() * month / 12)"))
        input_df = input_df.withColumn("month_cos", expr("cos(2 * pi() * month / 12)"))
        input_df = input_df.withColumn("carrier_prop", col("carrier_ct") / col("arr_del15"))
        input_df = input_df.withColumn("weather_prop", col("weather_ct") / col("arr_del15"))
        input_df = input_df.withColumn("nas_prop", col("nas_ct") / col("arr_del15"))
        input_df = input_df.withColumn("late_aircraft_prop", col("late_aircraft_ct") / col("arr_del15"))
        input_df = input_df.fillna({"carrier_prop": 0, "weather_prop": 0, "nas_prop": 0, "late_aircraft_prop": 0})
        
        # Add interaction term
        input_df = input_df.withColumn("carrier_airport_interaction",
                       coalesce(col("carrier").cast("string") + "_" + col("airport"), lit("Unknown_Unknown")))
        
        logger.info("Applying transformers...")
        # Apply indexers
        input_df = carrier_indexer.transform(input_df)
        input_df = airport_indexer.transform(input_df)
        input_df = interaction_indexer.transform(input_df)
        
        # Normalize arr_flights
        assembler_temp = VectorAssembler(inputCols=["arr_flights"], outputCol="arr_flights_vec")
        input_df = assembler_temp.transform(input_df)
        input_df = scaler.transform(input_df)
        
        # Assemble features
        features = [
            "year", "month_sin", "month_cos", "carrier_index", "airport_index",
            "interaction_index", "arr_flights_scaled", "carrier_prop", "weather_prop",
            "nas_prop", "late_aircraft_prop"
        ]
        assembler = VectorAssembler(inputCols=features, outputCol="features", handleInvalid="skip")
        input_df = assembler.transform(input_df)
        
        # Make prediction
        logger.info("Making prediction...")
        predictions = model.transform(input_df)
        result = predictions.select("probability", "prediction").collect()[0]
        
        delay_probability = result["probability"][1]
        prediction = result["prediction"]
        
        result_dict = {
            "delay_prediction": int(prediction),
            "delay_probability": float(delay_probability),
            "is_likely_delayed": prediction == 1.0
        }
        logger.info(f"Prediction result: {result_dict}")
        return result_dict
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        raise

# Check if Java version is compatible
def check_java_compatibility():
    try:
        result = subprocess.run(['java', '-version'], capture_output=True, text=True, stderr=subprocess.STDOUT)
        java_version = result.stdout
        logger.info(f"Java version: {java_version}")
        
        if "version" in java_version:
            if "1.8" in java_version or "8." in java_version or "11." in java_version:
                logger.info("Compatible Java version detected")
                return True
            elif "24" in java_version:
                logger.warning("Java 24 detected. This may cause compatibility issues with PySpark.")
                return False
            else:
                logger.warning(f"Untested Java version detected: {java_version}")
                return False
        return False
    except Exception as e:
        logger.error(f"Error checking Java compatibility: {str(e)}")
        return False

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/health')
def health():
    """Simple health check endpoint"""
    return jsonify({
        "status": "OK", 
        "message": "Server is running", 
        "java_compatible": check_java_compatibility(),
        "aws_credentials": os.environ.get("AWS_ACCESS_KEY_ID") is not None and os.environ.get("AWS_SECRET_ACCESS_KEY") is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        logger.info("Received prediction request")
        # Get input data from form
        input_data = {
            "year": int(request.form.get('year')),
            "month": int(request.form.get('month')),
            "carrier": request.form.get('carrier'),
            "airport": request.form.get('airport'),
            "arr_flights": int(request.form.get('arr_flights')),
            "carrier_ct": int(request.form.get('carrier_ct', 0)),
            "weather_ct": int(request.form.get('weather_ct', 0)),
            "nas_ct": int(request.form.get('nas_ct', 0)),
            "late_aircraft_ct": int(request.form.get('late_aircraft_ct', 0)),
            "arr_del15": int(request.form.get('arr_del15', 1))  # Default to 1 to avoid division by zero
        }
        
        # Set up Spark environment
        setup_success = setup_spark_env()
        if not setup_success:
            return jsonify({"error": "Failed to set up Spark environment"}), 500
        
        logger.info("Initializing Spark and loading models")
        # Initialize Spark and load models
        spark = initialize_spark()
        models = load_models(spark)
        
        # Make prediction
        result = predict_delay(input_data, spark, models)
        
        # Stop Spark session
        logger.info("Stopping Spark session")
        spark.stop()
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in prediction endpoint: {str(e)}")
        error_msg = str(e)
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    logger.info("Starting Airline Delay Prediction App")
    # Check AWS credentials
    try:
        # Test if AWS credentials are set
        aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
        aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
        
        if not aws_key or not aws_secret:
            logger.error("AWS credentials not found in environment variables.")
            logger.error("Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables or add them to the .env file.")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Error checking AWS credentials: {str(e)}")
        sys.exit(1)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=8080) 
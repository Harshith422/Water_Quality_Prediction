# Airline Delay Prediction App

This application uses a machine learning model stored in AWS S3 to predict whether there's a high risk of flight delays based on various input parameters.

## Prerequisites

- Python 3.7+
- AWS credentials with access to the S3 bucket containing the model
- Java 8 or later (required for PySpark)

## Setup

1. Clone this repository:
```
git clone <repository-url>
cd <repository-directory>
```

2. Create a virtual environment and activate it:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

4. Set up your AWS credentials as environment variables:
```
# On Linux/Mac
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>

# On Windows
set AWS_ACCESS_KEY_ID=<your-access-key>
set AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

## Running the App

1. Start the application:
```
python predict_app.py
```

2. Open a web browser and go to:
```
http://localhost:5000
```

3. Fill in the flight information in the form and click "Predict Delay" to see the prediction results.

## How It Works

The application:
1. Takes user input on flight details
2. Loads the pre-trained Gradient Boosted Tree model from S3
3. Processes the input data with the same transformations used during training
4. Makes a prediction about delay risk (high risk if > 25% flights are expected to be delayed)
5. Returns the prediction result to the user

## Model Information

The model was trained on historical airline delay data and predicts whether more than 25% of flights will be delayed. Features used include:
- Year and month
- Carrier (airline)
- Airport
- Number of arrival flights
- Previous delay causes (carrier, weather, NAS, late aircraft)

## Troubleshooting

- Make sure AWS credentials are set correctly in your environment
- Check that Java is installed and JAVA_HOME is set correctly
- If you encounter memory issues, adjust the Spark memory settings in predict_app.py 
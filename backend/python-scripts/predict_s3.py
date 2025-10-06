"""
S3-Based Prediction Script (INFERENCE ONLY - NO TRAINING)
Loads model from AWS S3 and makes predictions

This script:
1. Downloads trained model from S3 (cached locally)
2. Preprocesses input data
3. Runs inference using the S3 model
4. Saves prediction results to S3

NO MODEL TRAINING - Only inference using cloud-stored model
"""

import sys
import json
import numpy as np
import pandas as pd
import cv2
from PIL import Image
import os
import boto3
from pathlib import Path
import tempfile
from datetime import datetime

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from tensorflow import keras
import joblib

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'eu-north-1')
S3_BUCKET_MODELS = os.getenv('S3_BUCKET_NAME', 'water-quality-models')
S3_BUCKET_PREDICTIONS = 'water-quality-predictions-data'

# Local cache directory
CACHE_DIR = Path(__file__).parent / 'model_cache'
CACHE_DIR.mkdir(exist_ok=True)

# Image configuration
IMG_SIZE = (224, 224)
SEQUENCE_LENGTH = 10

def download_model_from_s3():
    """Download model files from S3 to local cache"""
    try:
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        
        model_files = {
            'best_fusion_model.h5': 'model.h5',
            'scaler.pkl': 'scaler.pkl',
            'label_encoder.pkl': 'label_encoder.pkl',
            'feature_columns.json': 'feature_columns.json'
        }
        
        for s3_file, local_file in model_files.items():
            local_path = CACHE_DIR / local_file
            s3_key = f'models/water-quality-v1/{s3_file}'
            
            # Download if not cached or outdated
            if not local_path.exists():
                print(f"Downloading {s3_file} from S3...", file=sys.stderr)
                s3_client.download_file(S3_BUCKET_MODELS, s3_key, str(local_path))
                print(f"✓ Downloaded {s3_file}", file=sys.stderr)
        
        return {
            'model': str(CACHE_DIR / 'model.h5'),
            'scaler': str(CACHE_DIR / 'scaler.pkl'),
            'label_encoder': str(CACHE_DIR / 'label_encoder.pkl'),
            'features': str(CACHE_DIR / 'feature_columns.json')
        }
    except Exception as e:
        raise Exception(f"Failed to download model from S3: {str(e)}")

def load_model_from_s3():
    """Load model from S3 (with local caching)"""
    try:
        print("Loading model from S3...", file=sys.stderr)
        paths = download_model_from_s3()
        
        # Load model
        import tensorflow as tf
        try:
            model = keras.models.load_model(paths['model'], compile=False)
        except:
            model = tf.keras.models.load_model(paths['model'], compile=False, safe_mode=False)
        
        # Load preprocessors
        scaler = joblib.load(paths['scaler'])
        label_encoder = joblib.load(paths['label_encoder'])
        
        with open(paths['features'], 'r') as f:
            feature_config = json.load(f)
        
        print("✓ Model loaded from S3 successfully", file=sys.stderr)
        return model, scaler, label_encoder, feature_config
    except Exception as e:
        raise Exception(f"Model loading error: {str(e)}")

def preprocess_image(image_path):
    """Preprocess image for CNN"""
    img = Image.open(image_path).convert('RGB')
    img = img.resize(IMG_SIZE)
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

def preprocess_sensor_data(csv_path, scaler, feature_config):
    """Preprocess sensor data for LSTM"""
    df = pd.read_csv(csv_path)
    
    # Standardize columns
    data = {}
    for col in df.columns:
        col_lower = col.lower().strip()
        if 'ph' in col_lower: data['pH'] = df[col].iloc[-1]
        elif 'temp' in col_lower: data['Temperature'] = df[col].iloc[-1]
        elif 'tds' in col_lower: data['TDS'] = df[col].iloc[-1]
        elif 'turbidity' in col_lower: data['Turbidity'] = df[col].iloc[-1]
        elif 'do' in col_lower or 'oxygen' in col_lower: data['DO'] = df[col].iloc[-1]
    
    # Create feature array
    features = [data.get(col, 0) for col in feature_config.get('columns', ['pH', 'Temperature', 'TDS', 'Turbidity', 'DO'])]
    sensor_array = np.array([features])
    
    # Scale
    sensor_scaled = scaler.transform(sensor_array)
    
    # Create sequence
    sensor_sequence = np.repeat(sensor_scaled, SEQUENCE_LENGTH, axis=0)
    sensor_sequence = np.expand_dims(sensor_sequence, axis=0)
    
    return sensor_sequence, data

def upload_prediction_to_s3(prediction_data):
    """Upload prediction result to S3"""
    try:
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        
        # Create predictions bucket if needed
        try:
            s3_client.head_bucket(Bucket=S3_BUCKET_PREDICTIONS)
        except:
            try:
                if AWS_REGION == 'us-east-1':
                    s3_client.create_bucket(Bucket=S3_BUCKET_PREDICTIONS)
                else:
                    s3_client.create_bucket(
                        Bucket=S3_BUCKET_PREDICTIONS,
                        CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
                    )
            except:
                pass  # Bucket might already exist
        
        # Upload prediction
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        s3_key = f"predictions/{timestamp}_{prediction_data.get('id', 'unknown')}.json"
        
        s3_client.put_object(
            Bucket=S3_BUCKET_PREDICTIONS,
            Key=s3_key,
            Body=json.dumps(prediction_data),
            ContentType='application/json',
            ServerSideEncryption='AES256'
        )
        
        print(f"✓ Prediction saved to S3: s3://{S3_BUCKET_PREDICTIONS}/{s3_key}", file=sys.stderr)
        return s3_key
    except Exception as e:
        print(f"⚠ Failed to upload to S3: {str(e)}", file=sys.stderr)
        return None

def make_prediction(image_path, csv_path):
    """Make prediction using S3-stored model"""
    try:
        # Load model from S3
        model, scaler, label_encoder, feature_config = load_model_from_s3()
        
        # Preprocess inputs
        image_input = preprocess_image(image_path)
        sensor_input, sensor_readings = preprocess_sensor_data(csv_path, scaler, feature_config)
        
        # Make prediction
        print("Running inference...", file=sys.stderr)
        predictions = model.predict({
            'image_input': image_input,
            'sensor_input': sensor_input
        }, verbose=0)
        
        quality_pred = predictions[0]
        risk_pred = predictions[1]
        
        # Get classes
        quality_class = label_encoder.inverse_transform([np.argmax(quality_pred)])[0]
        risk_class = label_encoder.inverse_transform([np.argmax(risk_pred)])[0]
        
        # Build result
        result = {
            'id': datetime.now().strftime('%Y%m%d%H%M%S'),
            'timestamp': datetime.now().isoformat(),
            'water_quality': quality_class,
            'risk_level': risk_class,
            'confidence': {
                'quality': float(np.max(quality_pred) * 100),
                'risk': float(np.max(risk_pred) * 100)
            },
            'sensor_readings': sensor_readings,
            'parameters': {
                'pH': {'value': round(sensor_readings.get('pH', 0), 2), 'status': 'Normal' if 6.5 <= sensor_readings.get('pH', 7) <= 8.5 else 'Abnormal'},
                'Temperature': {'value': round(sensor_readings.get('Temperature', 0), 2), 'status': 'Normal' if 15 <= sensor_readings.get('Temperature', 25) <= 30 else 'Abnormal'},
                'TDS': {'value': round(sensor_readings.get('TDS', 0), 2), 'status': 'Normal' if sensor_readings.get('TDS', 0) < 500 else 'Abnormal'},
                'DO': {'value': round(sensor_readings.get('DO', 0), 2), 'status': 'Normal' if sensor_readings.get('DO', 0) > 5 else 'Abnormal'},
                'Turbidity': {'value': round(sensor_readings.get('Turbidity', 0), 2), 'status': 'Normal' if sensor_readings.get('Turbidity', 0) < 5 else 'Abnormal'}
            },
            'method': 'hybrid_s3_model'
        }
        
        # Upload to S3
        s3_key = upload_prediction_to_s3(result)
        if s3_key:
            result['s3_key'] = s3_key
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python predict_s3.py <image_path> <csv_path>'}))
        sys.exit(1)
    
    make_prediction(sys.argv[1], sys.argv[2])


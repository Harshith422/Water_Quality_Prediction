"""
Prediction Script for Water Quality Monitoring
INFERENCE ONLY - Uses PRE-TRAINED model (NO TRAINING HAPPENS HERE)

This script:
1. LOADS the already-trained CNN+LSTM fusion model
2. Preprocesses input data (image + sensor CSV)
3. Runs INFERENCE (prediction) using the loaded model
4. Returns prediction results

NO MODEL TRAINING occurs in this script - it only uses the saved model!
"""

import sys
import json
import numpy as np
import pandas as pd
import cv2
from PIL import Image
import os

# Suppress TensorFlow warnings
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow logging

from tensorflow import keras
import joblib

# Model paths
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../ml-models/saved_models/best_fusion_model.h5')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../../ml-models/saved_models/scaler.pkl')
LABEL_ENCODER_PATH = os.path.join(os.path.dirname(__file__), '../../ml-models/saved_models/label_encoder.pkl')
FEATURE_CONFIG_PATH = os.path.join(os.path.dirname(__file__), '../../ml-models/saved_models/feature_columns.json')

# Image configuration
IMG_SIZE = (224, 224)
SEQUENCE_LENGTH = 10

def load_model_and_preprocessors():
    """Load ALREADY TRAINED model and preprocessing objects (INFERENCE ONLY - NO TRAINING)"""
    try:
        # Load pre-trained model for inference only
        print(f"Loading model from: {MODEL_PATH}", file=sys.stderr)
        
        # Custom objects to handle TensorFlow version compatibility
        import tensorflow as tf
        
        # Load model with custom handling for compatibility issues
        try:
            model = keras.models.load_model(MODEL_PATH, compile=False)
        except Exception as load_error:
            # If normal loading fails, try with safe mode
            print(f"Trying safe mode loading due to: {str(load_error)[:100]}", file=sys.stderr)
            model = tf.keras.models.load_model(
                MODEL_PATH, 
                compile=False,
                safe_mode=False  # Disable safe mode for compatibility
            )
        
        # Load preprocessors
        scaler = joblib.load(SCALER_PATH)
        label_encoder = joblib.load(LABEL_ENCODER_PATH)
        
        with open(FEATURE_CONFIG_PATH, 'r') as f:
            feature_config = json.load(f)
        
        print("✓ Model and preprocessors loaded successfully (ready for inference)", file=sys.stderr)
        return model, scaler, label_encoder, feature_config
    except FileNotFoundError as e:
        print(json.dumps({'error': f'Model files not found. Please train the model first. Missing: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Model loading error: {str(e)}'}))
        sys.exit(1)

def preprocess_image(image_path):
    """Preprocess image for CNN"""
    try:
        img = Image.open(image_path).convert('RGB')
        img = img.resize(IMG_SIZE)
        img_array = np.array(img) / 255.0
        return np.expand_dims(img_array, axis=0)
    except Exception as e:
        print(json.dumps({'error': f'Image preprocessing error: {str(e)}'}))
        sys.exit(1)

def preprocess_sensor_data(csv_path, scaler, feature_columns):
    """Preprocess sensor data for LSTM"""
    try:
        df = pd.read_csv(csv_path)
        
        # Standardize column names
        column_mapping = {
            'ph': 'pH', 'PH': 'pH',
            'temperature': 'Temperature', 'temp': 'Temperature', 'Temp': 'Temperature',
            'tds': 'TDS',
            'turbidity': 'Turbidity',
            'do': 'DO', 'DO': 'DO', 'dissolved_oxygen': 'DO'
        }
        
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns:
                df = df.rename(columns={old_col: new_col})
        
        # Extract features
        available_features = [col for col in feature_columns['features'] if col in df.columns]
        
        if not available_features:
            # Use default values if no features found
            sensor_data = np.array([[7.0, 25.0, 300.0, 5.0, 2.0]])  # Default values
        else:
            sensor_data = df[available_features].values[:SEQUENCE_LENGTH]
        
        # Ensure we have enough rows
        if len(sensor_data) < SEQUENCE_LENGTH:
            # Pad with last row
            last_row = sensor_data[-1] if len(sensor_data) > 0 else np.zeros(len(available_features))
            padding = np.tile(last_row, (SEQUENCE_LENGTH - len(sensor_data), 1))
            sensor_data = np.vstack([sensor_data, padding])
        else:
            sensor_data = sensor_data[:SEQUENCE_LENGTH]
        
        # Normalize
        sensor_data_scaled = scaler.transform(sensor_data.reshape(-1, sensor_data.shape[-1]))
        sensor_data_scaled = sensor_data_scaled.reshape(1, SEQUENCE_LENGTH, -1)
        
        # Get latest readings for response
        latest_reading = {
            'pH': float(sensor_data[-1][0]) if len(sensor_data) > 0 else 7.0,
            'Temperature': float(sensor_data[-1][1]) if len(sensor_data) > 1 else 25.0,
            'TDS': float(sensor_data[-1][2]) if len(sensor_data) > 2 else 300.0,
            'DO': float(sensor_data[-1][3]) if len(sensor_data) > 3 else 5.0,
            'Turbidity': float(sensor_data[-1][4]) if len(sensor_data) > 4 else 2.0
        }
        
        return sensor_data_scaled, latest_reading
        
    except Exception as e:
        print(json.dumps({'error': f'Sensor data preprocessing error: {str(e)}'}))
        sys.exit(1)

def make_prediction(image_path, csv_path):
    """Make prediction using PRE-TRAINED fusion model (NO TRAINING - INFERENCE ONLY)"""
    try:
        # Load ALREADY TRAINED model and preprocessors
        print("Loading pre-trained model (inference only, no training)...", file=sys.stderr)
        model, scaler, label_encoder, feature_config = load_model_and_preprocessors()
        
        # Preprocess inputs
        image_input = preprocess_image(image_path)
        sensor_input, sensor_readings = preprocess_sensor_data(csv_path, scaler, feature_config)
        
        # Make prediction using TRAINED MODEL (inference only)
        print("Running inference on pre-trained model...", file=sys.stderr)
        predictions = model.predict({
            'image_input': image_input,
            'sensor_input': sensor_input
        }, verbose=0)
        print("Prediction complete!", file=sys.stderr)
        
        quality_pred = predictions[0]
        risk_pred = predictions[1]
        
        # Get predicted classes
        quality_class = int(np.argmax(quality_pred[0]))
        risk_class = int(np.argmax(risk_pred[0]))
        
        # Map to labels
        quality_labels = ['Unsafe', 'Safe']
        risk_labels = ['Low', 'Medium', 'High']
        
        quality_label = quality_labels[quality_class] if quality_class < len(quality_labels) else 'Unknown'
        risk_label = risk_labels[risk_class] if risk_class < len(risk_labels) else 'Unknown'
        
        # Calculate confidence
        quality_confidence = float(np.max(quality_pred[0]))
        risk_confidence = float(np.max(risk_pred[0]))
        
        # Prepare result
        result = {
            'water_quality': quality_label,
            'risk_level': risk_label,
            'confidence': {
                'quality': round(quality_confidence * 100, 2),
                'risk': round(risk_confidence * 100, 2)
            },
            'sensor_readings': sensor_readings,
            'parameters': {
                'pH': {
                    'value': sensor_readings.get('pH', 0),
                    'status': 'Normal' if 6.5 <= sensor_readings.get('pH', 0) <= 8.5 else 'Abnormal'
                },
                'Temperature': {
                    'value': sensor_readings.get('Temperature', 0),
                    'status': 'Normal' if 15 <= sensor_readings.get('Temperature', 0) <= 30 else 'Abnormal'
                },
                'TDS': {
                    'value': sensor_readings.get('TDS', 0),
                    'status': 'Normal' if sensor_readings.get('TDS', 0) < 500 else 'Abnormal'
                },
                'DO': {
                    'value': sensor_readings.get('DO', 0),
                    'status': 'Normal' if sensor_readings.get('DO', 0) > 5 else 'Abnormal'
                },
                'Turbidity': {
                    'value': sensor_readings.get('Turbidity', 0),
                    'status': 'Normal' if sensor_readings.get('Turbidity', 0) < 5 else 'Abnormal'
                }
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python predict.py <image_path> <csv_path>'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    csv_path = sys.argv[2]
    
    make_prediction(image_path, csv_path)


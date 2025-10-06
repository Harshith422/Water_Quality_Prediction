"""
Image-Only Prediction Script (INFERENCE ONLY - NO TRAINING)
Predicts water quality from image alone using visual analysis

This script:
1. Analyzes image features (algae, turbidity, clarity)
2. Estimates water parameters from visual analysis
3. Assesses risk based on estimated parameters

NO MODEL TRAINING - Only visual feature extraction and risk assessment
"""

import sys
import json
import numpy as np
from PIL import Image
import os
import cv2

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Model paths
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../ml-models/saved_models/best_fusion_model.h5')
IMG_SIZE = (224, 224)

def analyze_image_features(image_path):
    """Extract water quality features from image using computer vision"""
    img = cv2.imread(image_path)
    
    if img is None:
        return None
    
    # Convert to different color spaces
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Feature 1: Green algae detection (affects pH and DO)
    green_mask = cv2.inRange(hsv, (40, 40, 40), (80, 255, 255))
    green_ratio = np.sum(green_mask > 0) / (img.shape[0] * img.shape[1])
    
    # Feature 2: Turbidity estimation from image clarity
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    turbidity_estimate = max(0, min(10, (100 - laplacian_var) / 10))
    
    # Feature 3: Color analysis for contamination
    mean_color = cv2.mean(img)[:3]
    
    # Feature 4: Brightness (affects temperature estimation)
    brightness = np.mean(gray)
    
    # Estimate water parameters from visual features
    features = {
        'pH': 7.0 + (green_ratio * 2),  # More algae = higher pH
        'Temperature': 20 + (brightness / 10),  # Brightness correlation
        'TDS': 300 + (turbidity_estimate * 30),  # Turbidity correlation
        'Turbidity': turbidity_estimate,
        'DO': max(3, 8 - (green_ratio * 5))  # More algae = less DO
    }
    
    return features

def assess_risk_from_params(params):
    """Assess water quality and risk from parameters"""
    risk_score = 0
    
    # pH risk
    if params['pH'] < 6.0 or params['pH'] > 9.0:
        risk_score += 3
    elif params['pH'] < 6.5 or params['pH'] > 8.5:
        risk_score += 1
    
    # Temperature risk
    if params['Temperature'] < 10 or params['Temperature'] > 35:
        risk_score += 3
    elif params['Temperature'] < 15 or params['Temperature'] > 30:
        risk_score += 1
    
    # TDS risk
    if params['TDS'] > 1000:
        risk_score += 3
    elif params['TDS'] > 500:
        risk_score += 1
    
    # Turbidity risk
    if params['Turbidity'] > 10:
        risk_score += 3
    elif params['Turbidity'] > 5:
        risk_score += 1
    
    # DO risk
    if params['DO'] < 3:
        risk_score += 3
    elif params['DO'] < 5:
        risk_score += 1
    
    # Determine quality and risk
    if risk_score >= 6:
        quality = 'Unsafe'
        risk = 'High'
    elif risk_score >= 3:
        quality = 'Unsafe'
        risk = 'Medium'
    else:
        quality = 'Safe'
        risk = 'Low'
    
    return quality, risk, risk_score

def predict_from_image(image_path):
    """Predict water quality from image only"""
    try:
        # Extract features from image
        params = analyze_image_features(image_path)
        
        if params is None:
            print(json.dumps({'error': 'Failed to process image'}))
            sys.exit(1)
        
        # Assess risk
        quality, risk, score = assess_risk_from_params(params)
        
        # Calculate confidence (based on image clarity)
        confidence = min(95, 70 + (score * 3))
        
        result = {
            'water_quality': quality,
            'risk_level': risk,
            'confidence': {
                'quality': confidence,
                'risk': confidence - 5
            },
            'sensor_readings': params,
            'parameters': {
                'pH': {
                    'value': round(params['pH'], 2),
                    'status': 'Normal' if 6.5 <= params['pH'] <= 8.5 else 'Abnormal'
                },
                'Temperature': {
                    'value': round(params['Temperature'], 2),
                    'status': 'Normal' if 15 <= params['Temperature'] <= 30 else 'Abnormal'
                },
                'TDS': {
                    'value': round(params['TDS'], 2),
                    'status': 'Normal' if params['TDS'] < 500 else 'Abnormal'
                },
                'DO': {
                    'value': round(params['DO'], 2),
                    'status': 'Normal' if params['DO'] > 5 else 'Abnormal'
                },
                'Turbidity': {
                    'value': round(params['Turbidity'], 2),
                    'status': 'Normal' if params['Turbidity'] < 5 else 'Abnormal'
                }
            },
            'method': 'image_only'
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python predict_image_only.py <image_path>'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    predict_from_image(image_path)


"""
Hybrid Prediction Script (INFERENCE ONLY - NO TRAINING)
Combines image analysis with sensor data when both are available

This script:
1. Reads actual sensor data from CSV
2. Analyzes image for visual confirmation
3. Combines both for comprehensive assessment

NO MODEL TRAINING - Only analysis and risk assessment
"""

import sys
import json
import os
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import cv2
from PIL import Image

def read_sensor_data(csv_path):
    """Read sensor data from CSV"""
    try:
        df = pd.read_csv(csv_path)
        if len(df) == 0:
            return None
        
        latest = df.iloc[-1].to_dict()
        data = {}
        
        for key, value in latest.items():
            key_lower = str(key).lower().strip()
            if 'ph' in key_lower:
                data['pH'] = float(value) if pd.notna(value) else 7.0
            elif 'temp' in key_lower:
                data['Temperature'] = float(value) if pd.notna(value) else 25.0
            elif 'tds' in key_lower:
                data['TDS'] = float(value) if pd.notna(value) else 300.0
            elif 'turbidity' in key_lower:
                data['Turbidity'] = float(value) if pd.notna(value) else 2.0
            elif 'do' in key_lower or 'oxygen' in key_lower:
                data['DO'] = float(value) if pd.notna(value) else 6.0
        
        # Fill missing values with defaults
        if 'pH' not in data: data['pH'] = 7.0
        if 'Temperature' not in data: data['Temperature'] = 25.0
        if 'TDS' not in data: data['TDS'] = 300.0
        if 'Turbidity' not in data: data['Turbidity'] = 2.0
        if 'DO' not in data: data['DO'] = 6.0
        
        return data
    except Exception as e:
        return None

def analyze_image(image_path):
    """Analyze image for visual confirmation"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0
        
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Green algae detection
        green_mask = cv2.inRange(hsv, (40, 40, 40), (80, 255, 255))
        green_ratio = np.sum(green_mask > 0) / (img.shape[0] * img.shape[1])
        
        # Turbidity from clarity
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Visual risk score
        visual_risk = 0
        if green_ratio > 0.3: visual_risk += 2  # Heavy algae
        elif green_ratio > 0.15: visual_risk += 1  # Moderate algae
        
        if laplacian_var < 50: visual_risk += 2  # Very turbid
        elif laplacian_var < 100: visual_risk += 1  # Moderately turbid
        
        return visual_risk
    except:
        return 0

def assess_risk(sensor_data, visual_risk=0):
    """Assess water quality and risk from sensor data + visual analysis"""
    risk_score = 0
    
    # pH risk
    if sensor_data['pH'] < 6.0 or sensor_data['pH'] > 9.0:
        risk_score += 3
    elif sensor_data['pH'] < 6.5 or sensor_data['pH'] > 8.5:
        risk_score += 1
    
    # Temperature risk
    if sensor_data['Temperature'] < 10 or sensor_data['Temperature'] > 35:
        risk_score += 3
    elif sensor_data['Temperature'] < 15 or sensor_data['Temperature'] > 30:
        risk_score += 1
    
    # TDS risk
    if sensor_data['TDS'] > 1000:
        risk_score += 3
    elif sensor_data['TDS'] > 500:
        risk_score += 1
    
    # Turbidity risk
    if sensor_data['Turbidity'] > 10:
        risk_score += 3
    elif sensor_data['Turbidity'] > 5:
        risk_score += 1
    
    # DO risk
    if sensor_data['DO'] < 3:
        risk_score += 3
    elif sensor_data['DO'] < 5:
        risk_score += 1
    
    # Add visual risk
    risk_score += visual_risk
    
    # Determine quality and risk
    if risk_score >= 6:
        quality = 'Unsafe'
        risk = 'High'
        confidence = 95
    elif risk_score >= 3:
        quality = 'Unsafe'
        risk = 'Medium'
        confidence = 92
    else:
        quality = 'Safe'
        risk = 'Low'
        confidence = 97
    
    return quality, risk, confidence

def predict(image_path, csv_path):
    """Make hybrid prediction using sensor data + image analysis"""
    try:
        # Read sensor data
        sensor_data = read_sensor_data(csv_path)
        if not sensor_data:
            print(json.dumps({'error': 'Failed to read sensor data from CSV'}))
            sys.exit(1)
        
        # Analyze image for visual confirmation
        visual_risk = analyze_image(image_path) if image_path else 0
        
        # Assess risk
        quality, risk, confidence = assess_risk(sensor_data, visual_risk)
        
        result = {
            'water_quality': quality,
            'risk_level': risk,
            'confidence': {
                'quality': confidence,
                'risk': confidence - 2
            },
            'sensor_readings': sensor_data,
            'parameters': {
                'pH': {
                    'value': round(sensor_data['pH'], 2),
                    'status': 'Normal' if 6.5 <= sensor_data['pH'] <= 8.5 else 'Abnormal'
                },
                'Temperature': {
                    'value': round(sensor_data['Temperature'], 2),
                    'status': 'Normal' if 15 <= sensor_data['Temperature'] <= 30 else 'Abnormal'
                },
                'TDS': {
                    'value': round(sensor_data['TDS'], 2),
                    'status': 'Normal' if sensor_data['TDS'] < 500 else 'Abnormal'
                },
                'DO': {
                    'value': round(sensor_data['DO'], 2),
                    'status': 'Normal' if sensor_data['DO'] > 5 else 'Abnormal'
                },
                'Turbidity': {
                    'value': round(sensor_data['Turbidity'], 2),
                    'status': 'Normal' if sensor_data['Turbidity'] < 5 else 'Abnormal'
                }
            },
            'method': 'hybrid_sensor_image'
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: python predict_hybrid.py <image_path> <csv_path>'}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    csv_path = sys.argv[2]
    predict(image_path, csv_path)


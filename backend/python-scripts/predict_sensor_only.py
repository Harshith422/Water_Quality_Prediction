"""
Sensor-Only Prediction Script (INFERENCE ONLY - NO TRAINING)
Predicts water quality from sensor data alone using rule-based assessment

This script:
1. Reads sensor data from CSV
2. Applies water quality thresholds
3. Assesses risk based on sensor readings

NO MODEL TRAINING - Only sensor data analysis and risk assessment
"""

import sys
import json
import os

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

import pandas as pd

def assess_risk_from_sensor(data):
    """Assess water quality and risk from sensor data"""
    risk_score = 0
    
    # pH risk
    if data['pH'] < 6.0 or data['pH'] > 9.0:
        risk_score += 3
    elif data['pH'] < 6.5 or data['pH'] > 8.5:
        risk_score += 1
    
    # Temperature risk
    if data['Temperature'] < 10 or data['Temperature'] > 35:
        risk_score += 3
    elif data['Temperature'] < 15 or data['Temperature'] > 30:
        risk_score += 1
    
    # TDS risk (if available)
    if 'TDS' in data and data['TDS'] is not None:
        if data['TDS'] > 1000:
            risk_score += 3
        elif data['TDS'] > 500:
            risk_score += 1
    
    # Turbidity risk (if available)
    if 'Turbidity' in data and data['Turbidity'] is not None:
        if data['Turbidity'] > 10:
            risk_score += 3
        elif data['Turbidity'] > 5:
            risk_score += 1
    
    # DO risk
    if 'DO' in data and data['DO'] is not None:
        if data['DO'] < 3:
            risk_score += 3
        elif data['DO'] < 5:
            risk_score += 1
    
    # Determine quality and risk
    if risk_score >= 6:
        quality = 'Unsafe'
        risk = 'High'
        confidence = 92
    elif risk_score >= 3:
        quality = 'Unsafe'
        risk = 'Medium'
        confidence = 88
    else:
        quality = 'Safe'
        risk = 'Low'
        confidence = 95
    
    return quality, risk, confidence

def predict_from_sensor(csv_path):
    """Predict water quality from sensor data only"""
    try:
        # Read CSV
        df = pd.read_csv(csv_path)
        
        # Get latest reading or average
        if len(df) > 0:
            latest = df.iloc[-1].to_dict()
        else:
            print(json.dumps({'error': 'No data in CSV file'}))
            sys.exit(1)
        
        # Standardize column names
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
        if 'pH' not in data:
            data['pH'] = 7.0
        if 'Temperature' not in data:
            data['Temperature'] = 25.0
        if 'TDS' not in data:
            data['TDS'] = 300.0
        if 'Turbidity' not in data:
            data['Turbidity'] = 2.0
        if 'DO' not in data:
            data['DO'] = 6.0
        
        # Assess risk
        quality, risk, confidence = assess_risk_from_sensor(data)
        
        result = {
            'water_quality': quality,
            'risk_level': risk,
            'confidence': {
                'quality': confidence,
                'risk': confidence - 3
            },
            'sensor_readings': data,
            'parameters': {
                'pH': {
                    'value': round(data['pH'], 2),
                    'status': 'Normal' if 6.5 <= data['pH'] <= 8.5 else 'Abnormal'
                },
                'Temperature': {
                    'value': round(data['Temperature'], 2),
                    'status': 'Normal' if 15 <= data['Temperature'] <= 30 else 'Abnormal'
                },
                'TDS': {
                    'value': round(data['TDS'], 2),
                    'status': 'Normal' if data['TDS'] < 500 else 'Abnormal'
                },
                'DO': {
                    'value': round(data['DO'], 2),
                    'status': 'Normal' if data['DO'] > 5 else 'Abnormal'
                },
                'Turbidity': {
                    'value': round(data['Turbidity'], 2),
                    'status': 'Normal' if data['Turbidity'] < 5 else 'Abnormal'
                }
            },
            'method': 'sensor_only'
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': f'Prediction error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python predict_sensor_only.py <csv_path>'}))
        sys.exit(1)
    
    csv_path = sys.argv[1]
    predict_from_sensor(csv_path)


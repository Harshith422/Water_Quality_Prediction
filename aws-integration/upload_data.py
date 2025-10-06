"""
Data Upload Script
Uploads images to S3 and sensor data to DynamoDB
"""

import boto3
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
from uuid import uuid4

load_dotenv()

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'water-quality-images')
DYNAMODB_TABLE_SENSORS = 'sensor-readings'

s3_client = boto3.client('s3', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)

def upload_images_to_s3(images_dir):
    """Upload all images from directory to S3"""
    print(f"\nUploading images from: {images_dir}")
    
    count = 0
    for root, dirs, files in os.walk(images_dir):
        for file in files:
            if file.endswith(('.jpg', '.jpeg', '.png')):
                local_path = os.path.join(root, file)
                s3_key = f"datasets/images/{file}"
                
                try:
                    s3_client.upload_file(
                        local_path,
                        S3_BUCKET_NAME,
                        s3_key,
                        ExtraArgs={'ACL': 'public-read'}
                    )
                    count += 1
                    if count % 50 == 0:
                        print(f"  Uploaded {count} images...")
                except Exception as e:
                    print(f"  Error uploading {file}: {e}")
    
    print(f"✓ Uploaded {count} images to S3")
    return count

def upload_sensor_data_to_dynamodb(csv_path):
    """Upload sensor data from CSV to DynamoDB"""
    print(f"\nUploading sensor data from: {csv_path}")
    
    table = dynamodb.Table(DYNAMODB_TABLE_SENSORS)
    df = pd.read_csv(csv_path)
    
    # Standardize column names
    column_mapping = {
        'ph': 'pH', 'PH': 'pH',
        'temperature': 'Temperature', 'temp': 'Temperature',
        'tds': 'TDS',
        'turbidity': 'Turbidity',
        'do': 'DO', 'dissolved_oxygen': 'DO'
    }
    
    for old_col, new_col in column_mapping.items():
        if old_col in df.columns:
            df = df.rename(columns={old_col: new_col})
    
    count = 0
    batch_items = []
    
    for idx, row in df.iterrows():
        item = {
            'id': str(uuid4()),
            'timestamp': datetime.now().isoformat(),
            'pH': float(row.get('pH', 7.0)),
            'temperature': float(row.get('Temperature', 25.0)),
            'tds': float(row.get('TDS', 300.0)),
            'turbidity': float(row.get('Turbidity', 2.0)),
            'dissolvedOxygen': float(row.get('DO', 5.0))
        }
        
        batch_items.append(item)
        
        # Batch write every 25 items
        if len(batch_items) >= 25:
            with table.batch_writer() as batch:
                for batch_item in batch_items:
                    batch.put_item(Item=batch_item)
            count += len(batch_items)
            batch_items = []
            
            if count % 100 == 0:
                print(f"  Uploaded {count} records...")
    
    # Upload remaining items
    if batch_items:
        with table.batch_writer() as batch:
            for batch_item in batch_items:
                batch.put_item(Item=batch_item)
        count += len(batch_items)
    
    print(f"✓ Uploaded {count} sensor records to DynamoDB")
    return count

def main():
    print("\n" + "="*60)
    print("Data Upload to AWS")
    print("="*60)
    
    # Upload images
    images_dir = '../datasets/Fishpond Visual Condition Dataset/Fishpond Visual Condition Dataset/images'
    if os.path.exists(images_dir):
        upload_images_to_s3(images_dir)
    else:
        print(f"Images directory not found: {images_dir}")
    
    # Upload sensor data
    sensor_csvs = [
        '../datasets/Aquaponic Fish Pond/pond_iot_2023.csv',
        '../datasets/Fishpond Visual Condition Dataset/Fishpond Visual Condition Dataset/pond_dataset.csv'
    ]
    
    for csv_path in sensor_csvs:
        if os.path.exists(csv_path):
            upload_sensor_data_to_dynamodb(csv_path)
        else:
            print(f"CSV file not found: {csv_path}")
    
    print("\n" + "="*60)
    print("✓ Data upload completed!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()


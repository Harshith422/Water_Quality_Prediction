"""
Upload Trained Model to AWS S3
Uploads the trained model and preprocessors to S3 for cloud-based predictions
"""

import boto3
import os
from pathlib import Path
from botocore.exceptions import ClientError

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'eu-north-1')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'water-quality-models')

# Model files to upload
MODEL_DIR = Path(__file__).parent.parent / 'ml-models' / 'saved_models'
MODEL_FILES = [
    'best_fusion_model.h5',
    'scaler.pkl',
    'label_encoder.pkl',
    'feature_columns.json',
    'image_metadata.json'
]

def create_s3_bucket_if_not_exists(s3_client, bucket_name, region):
    """Create S3 bucket if it doesn't exist"""
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"✓ Bucket '{bucket_name}' already exists")
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            try:
                if region == 'us-east-1':
                    s3_client.create_bucket(Bucket=bucket_name)
                else:
                    s3_client.create_bucket(
                        Bucket=bucket_name,
                        CreateBucketConfiguration={'LocationConstraint': region}
                    )
                print(f"✓ Created bucket '{bucket_name}'")
            except ClientError as create_error:
                print(f"✗ Error creating bucket: {create_error}")
                raise
        else:
            print(f"✗ Error checking bucket: {e}")
            raise

def upload_file_to_s3(s3_client, file_path, bucket_name, s3_key):
    """Upload a file to S3"""
    try:
        s3_client.upload_file(
            str(file_path),
            bucket_name,
            s3_key,
            ExtraArgs={'ServerSideEncryption': 'AES256'}
        )
        print(f"✓ Uploaded: {file_path.name} -> s3://{bucket_name}/{s3_key}")
        return True
    except ClientError as e:
        print(f"✗ Error uploading {file_path.name}: {e}")
        return False

def main():
    """Main function to upload model to S3"""
    print("=" * 60)
    print("UPLOADING TRAINED MODEL TO AWS S3")
    print("=" * 60)
    
    # Initialize S3 client
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    
    # Create bucket if needed
    create_s3_bucket_if_not_exists(s3_client, S3_BUCKET_NAME, AWS_REGION)
    
    # Upload model files
    print(f"\nUploading model files from: {MODEL_DIR}")
    print("-" * 60)
    
    uploaded_count = 0
    for file_name in MODEL_FILES:
        file_path = MODEL_DIR / file_name
        
        if not file_path.exists():
            print(f"⚠ Skipping {file_name} (not found)")
            continue
        
        # S3 key (path in S3)
        s3_key = f"models/water-quality-v1/{file_name}"
        
        # Upload file
        if upload_file_to_s3(s3_client, file_path, S3_BUCKET_NAME, s3_key):
            uploaded_count += 1
    
    print("-" * 60)
    print(f"\n✓ Successfully uploaded {uploaded_count}/{len(MODEL_FILES)} files to S3")
    print(f"✓ Bucket: s3://{S3_BUCKET_NAME}/models/water-quality-v1/")
    print("\nModel is now available for cloud-based predictions!")
    print("=" * 60)

if __name__ == '__main__':
    main()


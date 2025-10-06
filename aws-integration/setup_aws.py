"""
AWS Setup Script
Creates S3 bucket and DynamoDB tables for Water Quality Monitoring System
"""

import boto3
import os
from dotenv import load_dotenv
import json

load_dotenv()

# AWS Configuration
AWS_REGION = os.getenv('AWS_REGION', 'eu-north-1')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'water-quality-images')
DYNAMODB_TABLE_PREDICTIONS = 'water-quality-predictions'
DYNAMODB_TABLE_SENSORS = 'sensor-readings'

def create_s3_bucket():
    """Create S3 bucket for storing images"""
    try:
        s3_client = boto3.client('s3', region_name=AWS_REGION)
        
        # Check if bucket exists
        try:
            s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
            print(f"✓ S3 bucket '{S3_BUCKET_NAME}' already exists")
            return True
        except:
            pass
        
        # Create bucket
        if AWS_REGION == 'us-east-1':
            s3_client.create_bucket(Bucket=S3_BUCKET_NAME)
        else:
            s3_client.create_bucket(
                Bucket=S3_BUCKET_NAME,
                CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
            )
        
        # Enable versioning
        s3_client.put_bucket_versioning(
            Bucket=S3_BUCKET_NAME,
            VersioningConfiguration={'Status': 'Enabled'}
        )
        
        # Set CORS configuration
        cors_configuration = {
            'CORSRules': [{
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE'],
                'AllowedOrigins': ['*'],
                'ExposeHeaders': ['ETag']
            }]
        }
        s3_client.put_bucket_cors(
            Bucket=S3_BUCKET_NAME,
            CORSConfiguration=cors_configuration
        )
        
        print(f"✓ Created S3 bucket: {S3_BUCKET_NAME}")
        return True
        
    except Exception as e:
        print(f"✗ Error creating S3 bucket: {e}")
        return False

def create_dynamodb_tables():
    """Create DynamoDB tables for predictions and sensor data"""
    try:
        dynamodb = boto3.client('dynamodb', region_name=AWS_REGION)
        
        # Create predictions table
        try:
            dynamodb.describe_table(TableName=DYNAMODB_TABLE_PREDICTIONS)
            print(f"✓ DynamoDB table '{DYNAMODB_TABLE_PREDICTIONS}' already exists")
        except:
            dynamodb.create_table(
                TableName=DYNAMODB_TABLE_PREDICTIONS,
                KeySchema=[
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'id', 'AttributeType': 'S'},
                    {'AttributeName': 'timestamp', 'AttributeType': 'S'}
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'timestamp-index',
                        'KeySchema': [
                            {'AttributeName': 'timestamp', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    }
                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            print(f"✓ Created DynamoDB table: {DYNAMODB_TABLE_PREDICTIONS}")
        
        # Create sensor readings table
        try:
            dynamodb.describe_table(TableName=DYNAMODB_TABLE_SENSORS)
            print(f"✓ DynamoDB table '{DYNAMODB_TABLE_SENSORS}' already exists")
        except:
            dynamodb.create_table(
                TableName=DYNAMODB_TABLE_SENSORS,
                KeySchema=[
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'id', 'AttributeType': 'S'},
                    {'AttributeName': 'timestamp', 'AttributeType': 'S'}
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'timestamp-index',
                        'KeySchema': [
                            {'AttributeName': 'timestamp', 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    }
                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            print(f"✓ Created DynamoDB table: {DYNAMODB_TABLE_SENSORS}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error creating DynamoDB tables: {e}")
        return False

def setup_iam_policy():
    """Print IAM policy for reference"""
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:ListBucket"
                ],
                "Resource": [
                    f"arn:aws:s3:::{S3_BUCKET_NAME}",
                    f"arn:aws:s3:::{S3_BUCKET_NAME}/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:Query",
                    "dynamodb:Scan"
                ],
                "Resource": [
                    f"arn:aws:dynamodb:{AWS_REGION}:*:table/{DYNAMODB_TABLE_PREDICTIONS}",
                    f"arn:aws:dynamodb:{AWS_REGION}:*:table/{DYNAMODB_TABLE_SENSORS}",
                    f"arn:aws:dynamodb:{AWS_REGION}:*:table/{DYNAMODB_TABLE_PREDICTIONS}/index/*",
                    f"arn:aws:dynamodb:{AWS_REGION}:*:table/{DYNAMODB_TABLE_SENSORS}/index/*"
                ]
            }
        ]
    }
    
    print("\n" + "="*60)
    print("IAM Policy (Add this to your IAM user/role):")
    print("="*60)
    print(json.dumps(policy, indent=2))

def main():
    print("\n" + "="*60)
    print("AWS Infrastructure Setup for Water Quality Monitoring")
    print("="*60 + "\n")
    
    print(f"Region: {AWS_REGION}")
    print(f"S3 Bucket: {S3_BUCKET_NAME}")
    print(f"DynamoDB Tables: {DYNAMODB_TABLE_PREDICTIONS}, {DYNAMODB_TABLE_SENSORS}\n")
    
    # Create S3 bucket
    print("Setting up S3 bucket...")
    s3_success = create_s3_bucket()
    
    # Create DynamoDB tables
    print("\nSetting up DynamoDB tables...")
    dynamodb_success = create_dynamodb_tables()
    
    # Print IAM policy
    setup_iam_policy()
    
    # Summary
    print("\n" + "="*60)
    print("Setup Summary:")
    print("="*60)
    print(f"S3 Bucket: {'✓ Success' if s3_success else '✗ Failed'}")
    print(f"DynamoDB Tables: {'✓ Success' if dynamodb_success else '✗ Failed'}")
    print("\n✓ AWS setup completed!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()


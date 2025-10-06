/**
 * Setup S3 Bucket for Prediction Storage
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const PREDICTIONS_BUCKET = process.env.S3_PREDICTIONS_BUCKET || 'water-quality-predictions-data';

async function setupS3Bucket() {
  console.log('=== SETTING UP S3 BUCKET FOR PREDICTIONS ===');
  console.log(`Bucket name: ${PREDICTIONS_BUCKET}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  
  try {
    // Check if bucket exists
    try {
      await s3.headBucket({ Bucket: PREDICTIONS_BUCKET }).promise();
      console.log('✓ Bucket already exists');
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('Creating bucket...');
        
        // Create bucket
        const createParams = {
          Bucket: PREDICTIONS_BUCKET,
          CreateBucketConfiguration: {
            LocationConstraint: process.env.AWS_REGION || 'us-east-1'
          }
        };
        
        // For us-east-1, don't specify LocationConstraint
        if (process.env.AWS_REGION === 'us-east-1' || !process.env.AWS_REGION) {
          delete createParams.CreateBucketConfiguration;
        }
        
        await s3.createBucket(createParams).promise();
        console.log('✓ Bucket created successfully');
        
        // Set up CORS configuration
        const corsParams = {
          Bucket: PREDICTIONS_BUCKET,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
                AllowedOrigins: ['*'],
                MaxAgeSeconds: 3000
              }
            ]
          }
        };
        
        await s3.putBucketCors(corsParams).promise();
        console.log('✓ CORS configuration set');
        
        // Set up bucket policy for public read access to predictions
        const bucketPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${PREDICTIONS_BUCKET}/predictions/*`
            }
          ]
        };
        
        await s3.putBucketPolicy({
          Bucket: PREDICTIONS_BUCKET,
          Policy: JSON.stringify(bucketPolicy)
        }).promise();
        console.log('✓ Bucket policy set for public read access');
        
      } else {
        throw error;
      }
    }
    
    // Test bucket access
    console.log('\nTesting bucket access...');
    await s3.listObjectsV2({ Bucket: PREDICTIONS_BUCKET, MaxKeys: 1 }).promise();
    console.log('✓ Bucket access confirmed');
    
    console.log('\n🎉 S3 bucket setup completed successfully!');
    console.log(`\nBucket URL: https://${PREDICTIONS_BUCKET}.s3.amazonaws.com/`);
    console.log('\nYou can now use the prediction storage system.');
    
  } catch (error) {
    console.error('❌ S3 bucket setup failed:', error.message);
    
    if (error.code === 'CredentialsError') {
      console.log('\n💡 Make sure your AWS credentials are configured:');
      console.log('   - Set AWS_ACCESS_KEY_ID environment variable');
      console.log('   - Set AWS_SECRET_ACCESS_KEY environment variable');
      console.log('   - Set AWS_REGION environment variable (optional, defaults to us-east-1)');
    } else if (error.code === 'NoSuchBucket') {
      console.log('\n💡 The bucket creation failed. Please check your AWS permissions.');
    }
    
    console.log('\n📝 For now, the system will work with local storage only.');
    console.log('   S3 storage will be skipped if not configured.');
  }
}

setupS3Bucket();

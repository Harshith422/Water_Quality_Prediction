/**
 * AWS Service (S3 Only - DynamoDB Removed!)
 * Handles AWS S3 operations for image storage
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'water-quality-images';

/**
 * Upload file to S3
 */
exports.uploadToS3 = async (filePath, s3Key) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

/**
 * Download file from S3
 */
exports.downloadFromS3 = async (s3Key, localPath) => {
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };

    const data = await s3.getObject(params).promise();
    fs.writeFileSync(localPath, data.Body);
    return localPath;
  } catch (error) {
    console.error('S3 download error:', error);
    throw error;
  }
};

/**
 * List files from S3
 */
exports.listS3Files = async (prefix = '') => {
  try {
    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix
    };

    const data = await s3.listObjectsV2(params).promise();
    return data.Contents || [];
  } catch (error) {
    console.error('S3 list error:', error);
    return [];
  }
};

/**
 * Delete file from S3
 */
exports.deleteFromS3 = async (s3Key) => {
  try {
    const params = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
};

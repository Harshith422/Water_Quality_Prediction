/**
 * AWS Routes
 * Handles AWS-specific operations
 */

const express = require('express');
const router = express.Router();
const awsController = require('../controllers/awsController');

// S3 routes
router.get('/s3/list', awsController.listS3Files);
router.get('/s3/download/:key', awsController.downloadFile);

// DynamoDB routes
router.get('/dynamodb/predictions', awsController.getPredictions);
router.get('/dynamodb/sensors', awsController.getSensors);

module.exports = router;


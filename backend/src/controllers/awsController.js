/**
 * AWS Controller
 * Handles AWS operations
 */

const awsService = require('../services/awsService');

/**
 * List files from S3
 */
exports.listS3Files = async (req, res, next) => {
  try {
    const { prefix = '' } = req.query;
    
    const files = await awsService.listS3Files(prefix);
    
    res.json({
      success: true,
      count: files.length,
      files: files.map(f => ({
        key: f.Key,
        size: f.Size,
        lastModified: f.LastModified
      }))
    });

  } catch (error) {
    console.error('List S3 files error:', error);
    next(error);
  }
};

/**
 * Download file from S3
 */
exports.downloadFile = async (req, res, next) => {
  try {
    const { key } = req.params;
    const localPath = `/tmp/${key.split('/').pop()}`;
    
    await awsService.downloadFromS3(key, localPath);
    
    res.download(localPath);

  } catch (error) {
    console.error('Download file error:', error);
    next(error);
  }
};

/**
 * Get predictions from DynamoDB
 */
exports.getPredictions = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    
    const predictions = await awsService.getPredictionHistory(parseInt(limit), 0);
    
    res.json({
      success: true,
      count: predictions.length,
      data: predictions
    });

  } catch (error) {
    console.error('Get predictions error:', error);
    next(error);
  }
};

/**
 * Get sensor readings from DynamoDB
 */
exports.getSensors = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    const sensors = await awsService.getSensorReadings(parseInt(limit));
    
    res.json({
      success: true,
      count: sensors.length,
      data: sensors
    });

  } catch (error) {
    console.error('Get sensors error:', error);
    next(error);
  }
};


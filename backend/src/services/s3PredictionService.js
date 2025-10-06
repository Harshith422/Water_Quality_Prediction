/**
 * S3 Prediction Service
 * Handles fetching and managing predictions from AWS S3
 */

const AWS = require('aws-sdk');
const path = require('path');

// Configure AWS
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const PREDICTIONS_BUCKET = 'water-quality-predictions-data';

/**
 * List all predictions from S3
 */
async function listPredictions(limit = 50) {
  try {
    const params = {
      Bucket: PREDICTIONS_BUCKET,
      Prefix: 'predictions/',
      MaxKeys: limit
    };

    const data = await s3.listObjectsV2(params).promise();
    
    if (!data.Contents || data.Contents.length === 0) {
      return [];
    }

    // Get all prediction files
    const predictions = await Promise.all(
      data.Contents
        .filter(item => item.Key.endsWith('.json'))
        .map(async (item) => {
          try {
            const obj = await s3.getObject({
              Bucket: PREDICTIONS_BUCKET,
              Key: item.Key
            }).promise();
            
            const prediction = JSON.parse(obj.Body.toString());
            prediction.s3_key = item.Key;
            prediction.s3_last_modified = item.LastModified;
            return prediction;
          } catch (err) {
            console.error(`Error reading ${item.Key}:`, err.message);
            return null;
          }
        })
    );

    // Filter out nulls and sort by timestamp
    return predictions
      .filter(p => p !== null)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  } catch (error) {
    if (error.code === 'NoSuchBucket') {
      console.log('Predictions bucket does not exist yet');
      return [];
    }
    throw error;
  }
}

/**
 * Get prediction by ID from S3
 */
async function getPredictionById(predictionId) {
  try {
    const params = {
      Bucket: PREDICTIONS_BUCKET,
      Prefix: 'predictions/'
    };

    const data = await s3.listObjectsV2(params).promise();
    
    const predictionFile = data.Contents.find(item => 
      item.Key.includes(predictionId)
    );

    if (!predictionFile) {
      return null;
    }

    const obj = await s3.getObject({
      Bucket: PREDICTIONS_BUCKET,
      Key: predictionFile.Key
    }).promise();

    return JSON.parse(obj.Body.toString());

  } catch (error) {
    console.error('Error getting prediction from S3:', error);
    return null;
  }
}

/**
 * Get prediction statistics from S3
 */
async function getPredictionStats() {
  try {
    const predictions = await listPredictions(1000); // Get all for stats

    const stats = {
      total: predictions.length,
      safe: predictions.filter(p => p.water_quality === 'Safe').length,
      unsafe: predictions.filter(p => p.water_quality === 'Unsafe').length,
      highRisk: predictions.filter(p => p.risk_level === 'High').length,
      mediumRisk: predictions.filter(p => p.risk_level === 'Medium').length,
      lowRisk: predictions.filter(p => p.risk_level === 'Low').length,
      latest: predictions[0] || null,
      averageConfidence: predictions.length > 0
        ? predictions.reduce((sum, p) => sum + (p.confidence?.quality || 0), 0) / predictions.length
        : 0
    };

    return stats;

  } catch (error) {
    console.error('Error getting stats from S3:', error);
    return {
      total: 0,
      safe: 0,
      unsafe: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      latest: null,
      averageConfidence: 0
    };
  }
}

/**
 * Get prediction trends from S3
 */
async function getPredictionTrends(period = '7d') {
  try {
    const predictions = await listPredictions(1000);
    
    const now = new Date();
    let startDate;
    
    switch(period) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const filteredPredictions = predictions.filter(p => 
      new Date(p.timestamp) >= startDate
    );

    // Group by date
    const trendData = {};
    filteredPredictions.forEach(p => {
      const date = new Date(p.timestamp).toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = { safe: 0, unsafe: 0, total: 0 };
      }
      trendData[date].total++;
      if (p.water_quality === 'Safe') {
        trendData[date].safe++;
      } else {
        trendData[date].unsafe++;
      }
    });

    return Object.entries(trendData).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

  } catch (error) {
    console.error('Error getting trends from S3:', error);
    return [];
  }
}

module.exports = {
  listPredictions,
  getPredictionById,
  getPredictionStats,
  getPredictionTrends
};


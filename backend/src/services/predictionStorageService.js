/**
 * Prediction Storage Service
 * Handles storing and retrieving prediction data from S3 in multiple formats
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
const PREDICTIONS_BUCKET = process.env.S3_PREDICTIONS_BUCKET || 'water-quality-predictions-data';

/**
 * Store prediction data in S3 in multiple formats
 */
exports.storePrediction = async (predictionData) => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('⚠️  AWS credentials not configured, skipping S3 storage');
      return { success: false, reason: 'AWS not configured' };
    }
    
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
    const predictionId = predictionData.id;
    
    // Create different storage formats
    const storagePromises = [];
    
    // 1. Store as individual JSON file
    const jsonKey = `predictions/json/${dateStr}/${predictionId}.json`;
    storagePromises.push(
      s3.upload({
        Bucket: PREDICTIONS_BUCKET,
        Key: jsonKey,
        Body: JSON.stringify(predictionData, null, 2),
        ContentType: 'application/json'
      }).promise()
    );
    
    // 2. Store as CSV row (append to daily CSV)
    const csvKey = `predictions/csv/${dateStr}/predictions.csv`;
    const csvRow = createCSVRow(predictionData);
    storagePromises.push(
      appendToCSV(csvKey, csvRow, predictionData.id === 1) // Add header if first prediction of day
    );
    
    // 3. Store in aggregated JSON file (for analytics)
    const aggregatedKey = `predictions/aggregated/${dateStr}/daily_predictions.json`;
    storagePromises.push(
      appendToAggregatedJSON(aggregatedKey, predictionData)
    );
    
    await Promise.all(storagePromises);
    
    console.log(`✓ Prediction ${predictionId} stored in S3 in multiple formats`);
    return {
      success: true,
      storagePaths: {
        json: jsonKey,
        csv: csvKey,
        aggregated: aggregatedKey
      }
    };
    
  } catch (error) {
    console.error('Error storing prediction in S3:', error);
    // Don't throw error, just log it and return failure
    return { success: false, error: error.message };
  }
};

/**
 * Create CSV row from prediction data
 */
function createCSVRow(prediction) {
  const sensor = prediction.sensorData || {};
  const params = prediction.parameters || {};
  
  return [
    prediction.id,
    prediction.timestamp,
    prediction.waterQuality,
    prediction.riskLevel,
    prediction.confidence?.quality || 0,
    prediction.confidence?.risk || 0,
    sensor.pH || 0,
    sensor.Temperature || 0,
    sensor.TDS || 0,
    sensor.DO || 0,
    sensor.Turbidity || 0,
    params.pH?.status || 'Unknown',
    params.Temperature?.status || 'Unknown',
    params.TDS?.status || 'Unknown',
    params.DO?.status || 'Unknown',
    params.Turbidity?.status || 'Unknown',
    prediction.method || 'unknown',
    prediction.imageUrl || ''
  ].map(field => `"${field}"`).join(',');
}

/**
 * Append CSV row to daily CSV file
 */
async function appendToCSV(csvKey, csvRow, isFirstRow = false) {
  try {
    let csvContent = '';
    
    // If first row of the day, add header
    if (isFirstRow) {
      const header = [
        'ID', 'Timestamp', 'Water_Quality', 'Risk_Level', 'Quality_Confidence', 'Risk_Confidence',
        'pH_Value', 'Temperature_Value', 'TDS_Value', 'DO_Value', 'Turbidity_Value',
        'pH_Status', 'Temperature_Status', 'TDS_Status', 'DO_Status', 'Turbidity_Status',
        'Method', 'Image_URL'
      ].map(field => `"${field}"`).join(',') + '\n';
      csvContent = header + csvRow + '\n';
    } else {
      // Try to get existing CSV content
      try {
        const existingData = await s3.getObject({
          Bucket: PREDICTIONS_BUCKET,
          Key: csvKey
        }).promise();
        csvContent = existingData.Body.toString() + csvRow + '\n';
      } catch (error) {
        // File doesn't exist, create new with header
        const header = [
          'ID', 'Timestamp', 'Water_Quality', 'Risk_Level', 'Quality_Confidence', 'Risk_Confidence',
          'pH_Value', 'Temperature_Value', 'TDS_Value', 'DO_Value', 'Turbidity_Value',
          'pH_Status', 'Temperature_Status', 'TDS_Status', 'DO_Status', 'Turbidity_Status',
          'Method', 'Image_URL'
        ].map(field => `"${field}"`).join(',') + '\n';
        csvContent = header + csvRow + '\n';
      }
    }
    
    await s3.upload({
      Bucket: PREDICTIONS_BUCKET,
      Key: csvKey,
      Body: csvContent,
      ContentType: 'text/csv'
    }).promise();
    
  } catch (error) {
    console.error('Error appending to CSV:', error);
    throw error;
  }
}

/**
 * Append to aggregated JSON file for analytics
 */
async function appendToAggregatedJSON(jsonKey, predictionData) {
  try {
    let aggregatedData = { predictions: [], summary: {} };
    
    // Try to get existing aggregated data
    try {
      const existingData = await s3.getObject({
        Bucket: PREDICTIONS_BUCKET,
        Key: jsonKey
      }).promise();
      aggregatedData = JSON.parse(existingData.Body.toString());
    } catch (error) {
      // File doesn't exist, start fresh
    }
    
    // Add new prediction
    aggregatedData.predictions.push(predictionData);
    
    // Update summary statistics
    aggregatedData.summary = calculateSummaryStats(aggregatedData.predictions);
    aggregatedData.lastUpdated = new Date().toISOString();
    
    await s3.upload({
      Bucket: PREDICTIONS_BUCKET,
      Key: jsonKey,
      Body: JSON.stringify(aggregatedData, null, 2),
      ContentType: 'application/json'
    }).promise();
    
  } catch (error) {
    console.error('Error appending to aggregated JSON:', error);
    throw error;
  }
}

/**
 * Calculate summary statistics for predictions
 */
function calculateSummaryStats(predictions) {
  if (predictions.length === 0) {
    return {
      total: 0,
      safe: 0,
      unsafe: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      averageConfidence: 0
    };
  }
  
  const stats = {
    total: predictions.length,
    safe: predictions.filter(p => p.waterQuality === 'Safe').length,
    unsafe: predictions.filter(p => p.waterQuality === 'Unsafe').length,
    highRisk: predictions.filter(p => p.riskLevel === 'High').length,
    mediumRisk: predictions.filter(p => p.riskLevel === 'Medium').length,
    lowRisk: predictions.filter(p => p.riskLevel === 'Low').length,
    averageConfidence: 0
  };
  
  // Calculate average confidence
  const totalConfidence = predictions.reduce((sum, p) => {
    return sum + (p.confidence?.quality || 0);
  }, 0);
  stats.averageConfidence = Math.round(totalConfidence / predictions.length);
  
  return stats;
}

function calculateAverageParameters(predictions) {
  if (!predictions || predictions.length === 0) {
    return {
      pH: 0,
      Temperature: 0,
      TDS: 0,
      DO: 0,
      Turbidity: 0
    };
  }

  const totals = {
    pH: 0,
    Temperature: 0,
    TDS: 0,
    DO: 0,
    Turbidity: 0
  };

  let validCount = 0;

  predictions.forEach(prediction => {
    if (prediction.sensorData) {
      totals.pH += prediction.sensorData.pH || 0;
      totals.Temperature += prediction.sensorData.Temperature || 0;
      totals.TDS += prediction.sensorData.TDS || 0;
      totals.DO += prediction.sensorData.DO || 0;
      totals.Turbidity += prediction.sensorData.Turbidity || 0;
      validCount++;
    }
  });

  if (validCount === 0) {
    return {
      pH: 0,
      Temperature: 0,
      TDS: 0,
      DO: 0,
      Turbidity: 0
    };
  }

  return {
    pH: Math.round((totals.pH / validCount) * 100) / 100,
    Temperature: Math.round((totals.Temperature / validCount) * 100) / 100,
    TDS: Math.round((totals.TDS / validCount) * 100) / 100,
    DO: Math.round((totals.DO / validCount) * 100) / 100,
    Turbidity: Math.round((totals.Turbidity / validCount) * 100) / 100
  };
}

function calculateParameterTrends(predictions) {
  if (!predictions || predictions.length === 0) {
    return [];
  }

  const trends = {};
  
  predictions.forEach(prediction => {
    const date = prediction.timestamp.split('T')[0];
    if (!trends[date]) {
      trends[date] = {
        date: date,
        pH: [],
        Temperature: [],
        TDS: [],
        DO: [],
        Turbidity: []
      };
    }
    
    if (prediction.sensorData) {
      trends[date].pH.push(prediction.sensorData.pH || 0);
      trends[date].Temperature.push(prediction.sensorData.Temperature || 0);
      trends[date].TDS.push(prediction.sensorData.TDS || 0);
      trends[date].DO.push(prediction.sensorData.DO || 0);
      trends[date].Turbidity.push(prediction.sensorData.Turbidity || 0);
    }
  });

  // Calculate daily averages
  return Object.values(trends).map(dayData => ({
    date: dayData.date,
    pH: dayData.pH.length > 0 ? Math.round((dayData.pH.reduce((a, b) => a + b, 0) / dayData.pH.length) * 100) / 100 : 0,
    Temperature: dayData.Temperature.length > 0 ? Math.round((dayData.Temperature.reduce((a, b) => a + b, 0) / dayData.Temperature.length) * 100) / 100 : 0,
    TDS: dayData.TDS.length > 0 ? Math.round((dayData.TDS.reduce((a, b) => a + b, 0) / dayData.TDS.length) * 100) / 100 : 0,
    DO: dayData.DO.length > 0 ? Math.round((dayData.DO.reduce((a, b) => a + b, 0) / dayData.DO.length) * 100) / 100 : 0,
    Turbidity: dayData.Turbidity.length > 0 ? Math.round((dayData.Turbidity.reduce((a, b) => a + b, 0) / dayData.Turbidity.length) * 100) / 100 : 0
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Get predictions for dashboard (recent data)
 */
exports.getDashboardData = async (days = 7) => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('⚠️  AWS credentials not configured, returning empty dashboard data');
      return { predictions: [], summary: {}, totalDays: 0 };
    }
    
    const predictions = [];
    const now = new Date();
    
    // Get predictions from last N days
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const aggregatedKey = `predictions/aggregated/${dateStr}/daily_predictions.json`;
        const data = await s3.getObject({
          Bucket: PREDICTIONS_BUCKET,
          Key: aggregatedKey
        }).promise();
        
        const dayData = JSON.parse(data.Body.toString());
        predictions.push(...dayData.predictions);
      } catch (error) {
        // No data for this day, continue
      }
    }
    
    // Sort by timestamp (newest first)
    predictions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return {
      predictions: predictions.slice(0, 50), // Last 50 predictions
      summary: calculateSummaryStats(predictions),
      averageParameters: calculateAverageParameters(predictions),
      totalDays: days
    };
    
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return { predictions: [], summary: {}, totalDays: 0 };
  }
};

/**
 * Get analytics data (aggregated statistics)
 */
exports.getAnalyticsData = async (period = '30d') => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('⚠️  AWS credentials not configured, returning empty analytics data');
      return { 
        period: period,
        totalPredictions: 0,
        summary: {},
        trends: [],
        parameterTrends: [],
        qualityDistribution: {},
        riskDistribution: {},
        methodDistribution: {},
        dailyStats: []
      };
    }
    
    const predictions = [];
    const now = new Date();
    let days;
    
    switch (period) {
      case '7d': days = 7; break;
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 30;
    }
    
    // Get predictions from specified period
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const aggregatedKey = `predictions/aggregated/${dateStr}/daily_predictions.json`;
        const data = await s3.getObject({
          Bucket: PREDICTIONS_BUCKET,
          Key: aggregatedKey
        }).promise();
        
        const dayData = JSON.parse(data.Body.toString());
        predictions.push(...dayData.predictions);
      } catch (error) {
        // No data for this day, continue
      }
    }
    
    // Calculate analytics
    const analytics = {
      period: period,
      totalPredictions: predictions.length,
      summary: calculateSummaryStats(predictions),
      trends: calculateTrends(predictions),
      parameterTrends: calculateParameterTrends(predictions),
      qualityDistribution: calculateQualityDistribution(predictions),
      riskDistribution: calculateRiskDistribution(predictions),
      methodDistribution: calculateMethodDistribution(predictions),
      dailyStats: calculateDailyStats(predictions, days)
    };
    
    return analytics;
    
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return { error: 'Failed to fetch analytics data' };
  }
};

/**
 * Calculate trends over time
 */
function calculateTrends(predictions) {
  const dailyStats = {};
  
  predictions.forEach(prediction => {
    const date = prediction.timestamp.split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { safe: 0, unsafe: 0, total: 0 };
    }
    dailyStats[date].total++;
    if (prediction.waterQuality === 'Safe') {
      dailyStats[date].safe++;
    } else {
      dailyStats[date].unsafe++;
    }
  });
  
  return Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      safe: stats.safe,
      unsafe: stats.unsafe,
      total: stats.total,
      safetyRate: Math.round((stats.safe / stats.total) * 100)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Calculate quality distribution
 */
function calculateQualityDistribution(predictions) {
  const distribution = { Safe: 0, Unsafe: 0 };
  predictions.forEach(p => distribution[p.waterQuality]++);
  return distribution;
}

/**
 * Calculate risk distribution
 */
function calculateRiskDistribution(predictions) {
  const distribution = { Low: 0, Medium: 0, High: 0 };
  predictions.forEach(p => distribution[p.riskLevel]++);
  return distribution;
}

/**
 * Calculate method distribution
 */
function calculateMethodDistribution(predictions) {
  const distribution = {};
  predictions.forEach(p => {
    const method = p.method || 'unknown';
    distribution[method] = (distribution[method] || 0) + 1;
  });
  return distribution;
}

/**
 * Calculate daily statistics
 */
function calculateDailyStats(predictions, days) {
  const dailyStats = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayPredictions = predictions.filter(p => 
      p.timestamp.startsWith(dateStr)
    );
    
    dailyStats.push({
      date: dateStr,
      count: dayPredictions.length,
      safe: dayPredictions.filter(p => p.waterQuality === 'Safe').length,
      unsafe: dayPredictions.filter(p => p.waterQuality === 'Unsafe').length,
      averageConfidence: dayPredictions.length > 0 
        ? Math.round(dayPredictions.reduce((sum, p) => sum + (p.confidence?.quality || 0), 0) / dayPredictions.length)
        : 0
    });
  }
  
  return dailyStats;
}

/**
 * Get prediction by ID
 */
exports.getPredictionById = async (predictionId) => {
  try {
    // Search through recent days to find the prediction
    const now = new Date();
    
    for (let i = 0; i < 30; i++) { // Search last 30 days
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const jsonKey = `predictions/json/${dateStr}/${predictionId}.json`;
        const data = await s3.getObject({
          Bucket: PREDICTIONS_BUCKET,
          Key: jsonKey
        }).promise();
        
        return JSON.parse(data.Body.toString());
      } catch (error) {
        // Not found in this day, continue searching
      }
    }
    
    return null; // Not found
    
  } catch (error) {
    console.error('Error getting prediction by ID:', error);
    return null;
  }
};

/**
 * List all available prediction dates
 */
exports.getAvailableDates = async () => {
  try {
    const params = {
      Bucket: PREDICTIONS_BUCKET,
      Prefix: 'predictions/aggregated/',
      Delimiter: '/'
    };
    
    const data = await s3.listObjectsV2(params).promise();
    const dates = data.CommonPrefixes
      ?.map(prefix => prefix.Prefix.split('/')[2])
      .filter(date => date && date.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort()
      .reverse() || [];
    
    return dates;
    
  } catch (error) {
    console.error('Error getting available dates:', error);
    return [];
  }
};

/**
 * Data Controller
 * Handles sensor data and analytics operations
 */

const awsService = require('../services/awsService');
const s3PredictionService = require('../services/s3PredictionService');
const dataStore = require('../services/dataStore');
const { v4: uuidv4 } = require('uuid');

/**
 * Get sensor readings (from local data store)
 */
exports.getSensorReadings = async (req, res, next) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;

    // Get all sensor readings
    let filteredReadings = dataStore.getAllSensorReadings();
    
    // Filter by date if provided
    if (startDate || endDate) {
      filteredReadings = filteredReadings.filter(reading => {
        const readingDate = new Date(reading.timestamp);
        if (startDate && readingDate < new Date(startDate)) return false;
        if (endDate && readingDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort and limit
    const result = filteredReadings
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      count: result.length,
      data: result,
      source: 'local'
    });

  } catch (error) {
    console.error('Get sensor readings error:', error);
    next(error);
  }
};

/**
 * Add sensor reading (to local data store)
 */
exports.addSensorReading = async (req, res, next) => {
  try {
    const { pH, temperature, tds, turbidity, dissolvedOxygen } = req.body;

    const sensorData = {
      id: uuidv4(),
      pH: parseFloat(pH),
      temperature: parseFloat(temperature),
      tds: parseFloat(tds),
      turbidity: parseFloat(turbidity),
      dissolvedOxygen: parseFloat(dissolvedOxygen),
      timestamp: new Date().toISOString()
    };

    // Save to local data store (no DynamoDB!)
    dataStore.addSensorReading(sensorData);
    console.log(`✓ Sensor reading saved locally (Total: ${dataStore.getAllSensorReadings().length})`);

    res.json({
      success: true,
      data: sensorData,
      source: 'local'
    });

  } catch (error) {
    console.error('Add sensor reading error:', error);
    next(error);
  }
};

/**
 * Get analytics summary (from S3 predictions)
 */
exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    // Try S3 first
    try {
      const stats = await s3PredictionService.getPredictionStats();
      const summary = {
        totalPredictions: stats.total,
        safeCount: stats.safe,
        unsafeCount: stats.unsafe,
        riskDistribution: {
          low: stats.lowRisk,
          medium: stats.mediumRisk,
          high: stats.highRisk
        },
        averageConfidence: stats.averageConfidence,
        latestPrediction: stats.latest,
        lastUpdated: new Date().toISOString(),
        source: 's3'
      };

      return res.json({
        success: true,
        data: summary
      });
    } catch (s3Error) {
      console.log('S3 fetch failed, using local data store:', s3Error.message);
    }

    // Fallback to local data store (no DynamoDB!)
    const predictions = dataStore.getAllPredictions();
    const sensorReadings = dataStore.getAllSensorReadings();

    const summary = {
      totalPredictions: predictions.length,
      safeCount: predictions.filter(p => p.waterQuality === 'Safe').length,
      unsafeCount: predictions.filter(p => p.waterQuality === 'Unsafe').length,
      riskDistribution: {
        low: predictions.filter(p => p.riskLevel === 'Low').length,
        medium: predictions.filter(p => p.riskLevel === 'Medium').length,
        high: predictions.filter(p => p.riskLevel === 'High').length
      },
      averageParameters: calculateAverageParameters(sensorReadings),
      lastUpdated: new Date().toISOString(),
      source: 'dynamodb'
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get analytics summary error:', error);
    next(error);
  }
};

/**
 * Get trends data (from local data store)
 */
exports.getTrends = async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;
    
    // Use local data store (no DynamoDB!)
    const predictions = dataStore.getAllPredictions();
    const sensorReadings = dataStore.getAllSensorReadings();

    // Calculate days based on period
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentPredictions = predictions.filter(p => 
      new Date(p.timestamp) >= cutoffDate
    );

    const recentSensors = sensorReadings.filter(s => 
      new Date(s.timestamp) >= cutoffDate
    );

    // Group by date
    const trendData = groupByDate(recentPredictions, recentSensors, days);

    res.json({
      success: true,
      period,
      data: trendData
    });

  } catch (error) {
    console.error('Get trends error:', error);
    next(error);
  }
};

/**
 * Get alerts (from local data store)
 */
exports.getAlerts = async (req, res, next) => {
  try {
    // Use local data store (no DynamoDB!)
    const predictions = dataStore.getPredictions(100, 0);
    
    const alerts = predictions
      .filter(p => p.waterQuality === 'Unsafe' || p.riskLevel === 'High')
      .map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        type: p.waterQuality === 'Unsafe' ? 'UNSAFE_WATER' : 'HIGH_RISK',
        severity: p.riskLevel,
        message: generateAlertMessage(p),
        data: p
      }));

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    next(error);
  }
};

// Helper functions
function calculateAverageParameters(readings) {
  if (readings.length === 0) {
    return {
      pH: 0,
      temperature: 0,
      tds: 0,
      turbidity: 0,
      dissolvedOxygen: 0
    };
  }

  const sum = readings.reduce((acc, r) => ({
    pH: acc.pH + (r.pH || 0),
    temperature: acc.temperature + (r.temperature || 0),
    tds: acc.tds + (r.tds || 0),
    turbidity: acc.turbidity + (r.turbidity || 0),
    dissolvedOxygen: acc.dissolvedOxygen + (r.dissolvedOxygen || 0)
  }), { pH: 0, temperature: 0, tds: 0, turbidity: 0, dissolvedOxygen: 0 });

  return {
    pH: (sum.pH / readings.length).toFixed(2),
    temperature: (sum.temperature / readings.length).toFixed(2),
    tds: (sum.tds / readings.length).toFixed(2),
    turbidity: (sum.turbidity / readings.length).toFixed(2),
    dissolvedOxygen: (sum.dissolvedOxygen / readings.length).toFixed(2)
  };
}

function groupByDate(predictions, sensors, days) {
  const result = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayPredictions = predictions.filter(p => 
      p.timestamp.startsWith(dateStr)
    );
    
    const daySensors = sensors.filter(s => 
      s.timestamp.startsWith(dateStr)
    );
    
    result.push({
      date: dateStr,
      safeCount: dayPredictions.filter(p => p.waterQuality === 'Safe').length,
      unsafeCount: dayPredictions.filter(p => p.waterQuality === 'Unsafe').length,
      averageParams: calculateAverageParameters(daySensors)
    });
  }
  
  return result.reverse();
}

function generateAlertMessage(prediction) {
  if (prediction.waterQuality === 'Unsafe') {
    return `Water quality detected as UNSAFE with ${prediction.riskLevel} risk level`;
  }
  return `High risk level detected in water quality monitoring`;
}


/**
 * Analytics Controller
 * Handles analytics and dashboard data from S3 storage
 */

const predictionStorage = require('../services/predictionStorageService');
const dataStore = require('../services/dataStore');

/**
 * Calculate average parameters from predictions
 */
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

/**
 * Calculate parameter trends over time
 */
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
 * Get dashboard data (recent predictions and summary)
 */
exports.getDashboardData = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    
    // Try S3 first, fallback to local storage
    let dashboardData;
    let source = 's3';
    
    try {
      dashboardData = await predictionStorage.getDashboardData(parseInt(days));
    } catch (error) {
      console.log('S3 dashboard data failed, using local storage:', error.message);
      dashboardData = null;
    }
    
    // If S3 returns empty data or fails, use local storage
    if (!dashboardData || !dashboardData.predictions || dashboardData.predictions.length === 0) {
      console.log('S3 data empty, using local storage for dashboard');
      const localPredictions = dataStore.getAllPredictions();
      
      // Calculate summary from local data
      const summary = {
        total: localPredictions.length,
        safe: localPredictions.filter(p => p.waterQuality === 'Safe').length,
        unsafe: localPredictions.filter(p => p.waterQuality === 'Unsafe').length,
        highRisk: localPredictions.filter(p => p.riskLevel === 'High').length,
        mediumRisk: localPredictions.filter(p => p.riskLevel === 'Medium').length,
        lowRisk: localPredictions.filter(p => p.riskLevel === 'Low').length,
        averageConfidence: localPredictions.length > 0 
          ? Math.round(localPredictions.reduce((sum, p) => sum + (p.confidence?.quality || 0), 0) / localPredictions.length)
          : 0
      };

      // Calculate average parameters from all predictions
      const averageParameters = calculateAverageParameters(localPredictions);
      
      dashboardData = {
        predictions: localPredictions.slice(0, 50), // Last 50 predictions
        summary: summary,
        averageParameters: averageParameters,
        totalDays: parseInt(days)
      };
      source = 'local';
    }
    
    res.json({
      success: true,
      data: dashboardData,
      source: source
    });
    
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
};

/**
 * Get analytics data (detailed statistics and trends)
 */
exports.getAnalyticsData = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Try S3 first, fallback to local storage
    let analyticsData = await predictionStorage.getAnalyticsData(period);
    let source = 's3';
    
    // If S3 returns empty data, use local storage
    if (!analyticsData.totalPredictions || analyticsData.totalPredictions === 0) {
      console.log('S3 analytics data empty, using local storage');
      const localPredictions = dataStore.getAllPredictions();
      
      // Calculate analytics from local data
      const summary = {
        total: localPredictions.length,
        safe: localPredictions.filter(p => p.waterQuality === 'Safe').length,
        unsafe: localPredictions.filter(p => p.waterQuality === 'Unsafe').length,
        highRisk: localPredictions.filter(p => p.riskLevel === 'High').length,
        mediumRisk: localPredictions.filter(p => p.riskLevel === 'Medium').length,
        lowRisk: localPredictions.filter(p => p.riskLevel === 'Low').length,
        averageConfidence: localPredictions.length > 0 
          ? Math.round(localPredictions.reduce((sum, p) => sum + (p.confidence?.quality || 0), 0) / localPredictions.length)
          : 0
      };
      
      // Calculate trends (group by date)
      const trends = {};
      localPredictions.forEach(prediction => {
        const date = prediction.timestamp.split('T')[0];
        if (!trends[date]) {
          trends[date] = { safe: 0, unsafe: 0, total: 0 };
        }
        trends[date].total++;
        if (prediction.waterQuality === 'Safe') {
          trends[date].safe++;
        } else {
          trends[date].unsafe++;
        }
      });
      
      const trendsArray = Object.entries(trends).map(([date, data]) => ({
        date,
        safe: data.safe,
        unsafe: data.unsafe,
        total: data.total,
        safetyRate: Math.round((data.safe / data.total) * 100)
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate parameter trends
      const parameterTrends = calculateParameterTrends(localPredictions);
      
      analyticsData = {
        period: period,
        totalPredictions: localPredictions.length,
        summary: summary,
        trends: trendsArray,
        parameterTrends: parameterTrends,
        qualityDistribution: {
          Safe: summary.safe,
          Unsafe: summary.unsafe
        },
        riskDistribution: {
          Low: summary.lowRisk,
          Medium: summary.mediumRisk,
          High: summary.highRisk
        },
        methodDistribution: {},
        dailyStats: trendsArray.map(trend => ({
          date: trend.date,
          count: trend.total,
          safe: trend.safe,
          unsafe: trend.unsafe,
          averageConfidence: summary.averageConfidence
        }))
      };
      source = 'local';
    }
    
    res.json({
      success: true,
      data: analyticsData,
      source: source
    });
    
  } catch (error) {
    console.error('Analytics data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
};

/**
 * Get prediction trends over time
 */
exports.getTrends = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Try S3 first, fallback to local storage
    let analyticsData = await predictionStorage.getAnalyticsData(period);
    let source = 's3';
    
    // If S3 returns empty data, use local storage
    if (!analyticsData.totalPredictions || analyticsData.totalPredictions === 0) {
      console.log('S3 trends data empty, using local storage');
      const localPredictions = dataStore.getAllPredictions();
      
      // Calculate trends from local data
      const trends = {};
      localPredictions.forEach(prediction => {
        const date = prediction.timestamp.split('T')[0];
        if (!trends[date]) {
          trends[date] = { safe: 0, unsafe: 0, total: 0 };
        }
        trends[date].total++;
        if (prediction.waterQuality === 'Safe') {
          trends[date].safe++;
        } else {
          trends[date].unsafe++;
        }
      });
      
      const trendsArray = Object.entries(trends).map(([date, data]) => ({
        date,
        safe: data.safe,
        unsafe: data.unsafe,
        total: data.total,
        safetyRate: Math.round((data.safe / data.total) * 100)
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
      
      analyticsData = {
        trends: trendsArray,
        totalPredictions: localPredictions.length
      };
      source = 'local';
    }
    
    res.json({
      success: true,
      data: {
        trends: analyticsData.trends || [],
        period: period,
        totalPredictions: analyticsData.totalPredictions || 0
      },
      source: source
    });
    
  } catch (error) {
    console.error('Trends data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends data'
    });
  }
};

/**
 * Get quality distribution statistics
 */
exports.getQualityDistribution = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    const analyticsData = await predictionStorage.getAnalyticsData(period);
    
    res.json({
      success: true,
      data: {
        qualityDistribution: analyticsData.qualityDistribution || {},
        riskDistribution: analyticsData.riskDistribution || {},
        methodDistribution: analyticsData.methodDistribution || {},
        period: period
      },
      source: 's3'
    });
    
  } catch (error) {
    console.error('Distribution data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch distribution data'
    });
  }
};

/**
 * Get daily statistics
 */
exports.getDailyStats = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    const analyticsData = await predictionStorage.getAnalyticsData(period);
    
    res.json({
      success: true,
      data: {
        dailyStats: analyticsData.dailyStats || [],
        period: period
      },
      source: 's3'
    });
    
  } catch (error) {
    console.error('Daily stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily statistics'
    });
  }
};

/**
 * Get available prediction dates
 */
exports.getAvailableDates = async (req, res, next) => {
  try {
    const availableDates = await predictionStorage.getAvailableDates();
    
    res.json({
      success: true,
      data: {
        dates: availableDates,
        count: availableDates.length
      },
      source: 's3'
    });
    
  } catch (error) {
    console.error('Available dates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available dates'
    });
  }
};

/**
 * Get prediction by ID from S3
 */
exports.getPredictionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const prediction = await predictionStorage.getPredictionById(id);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found'
      });
    }
    
    res.json({
      success: true,
      data: prediction,
      source: 's3'
    });
    
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction'
    });
  }
};

/**
 * Get parameter trends over time
 */
exports.getParameterTrends = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Try S3 first, fallback to local storage
    let analyticsData;
    let source = 's3';
    
    try {
      analyticsData = await predictionStorage.getAnalyticsData(period);
    } catch (error) {
      console.log('S3 parameter trends data failed, using local storage:', error.message);
      analyticsData = null;
    }
    
    // If S3 returns empty data or fails, use local storage
    if (!analyticsData || !analyticsData.totalPredictions || analyticsData.totalPredictions === 0) {
      console.log('S3 parameter trends data empty, using local storage');
      const localPredictions = dataStore.getAllPredictions();
      
      // Calculate parameter trends from local data
      const parameterTrends = calculateParameterTrends(localPredictions);
      
      analyticsData = {
        parameterTrends: parameterTrends,
        totalPredictions: localPredictions.length
      };
      source = 'local';
    }
    
    res.json({
      success: true,
      data: {
        parameterTrends: analyticsData.parameterTrends || [],
        period: period,
        totalPredictions: analyticsData.totalPredictions || 0
      },
      source: source
    });
    
  } catch (error) {
    console.error('Parameter trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parameter trends'
    });
  }
};

/**
 * Get summary statistics
 */
exports.getSummary = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    // Try S3 first, fallback to local storage
    let analyticsData = await predictionStorage.getAnalyticsData(period);
    let source = 's3';
    
    // If S3 returns empty data, use local storage
    if (!analyticsData.totalPredictions || analyticsData.totalPredictions === 0) {
      console.log('S3 summary data empty, using local storage');
      const localPredictions = dataStore.getAllPredictions();
      
      // Calculate summary from local data
      const summary = {
        total: localPredictions.length,
        safe: localPredictions.filter(p => p.waterQuality === 'Safe').length,
        unsafe: localPredictions.filter(p => p.waterQuality === 'Unsafe').length,
        highRisk: localPredictions.filter(p => p.riskLevel === 'High').length,
        mediumRisk: localPredictions.filter(p => p.riskLevel === 'Medium').length,
        lowRisk: localPredictions.filter(p => p.riskLevel === 'Low').length,
        averageConfidence: localPredictions.length > 0 
          ? Math.round(localPredictions.reduce((sum, p) => sum + (p.confidence?.quality || 0), 0) / localPredictions.length)
          : 0
      };
      
      analyticsData = {
        summary: summary,
        totalPredictions: localPredictions.length
      };
      source = 'local';
    }
    
    res.json({
      success: true,
      data: {
        summary: analyticsData.summary || {},
        totalPredictions: analyticsData.totalPredictions || 0,
        period: period,
        lastUpdated: new Date().toISOString()
      },
      source: source
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics'
    });
  }
};

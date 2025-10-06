import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prediction API
export const predict = async (formData) => {
  const response = await api.post('/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const batchPredict = async (formData) => {
  const response = await api.post('/predict/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getPredictionHistory = async (limit = 50, offset = 0) => {
  const response = await api.get('/predict/history', {
    params: { limit, offset },
  });
  return response.data;
};

export const getPredictionById = async (id) => {
  const response = await api.get(`/predict/history/${id}`);
  return response.data;
};

// Data API
export const getSensorReadings = async (limit = 100, startDate = null, endDate = null) => {
  const response = await api.get('/data/sensors', {
    params: { limit, startDate, endDate },
  });
  return response.data;
};

export const addSensorReading = async (data) => {
  const response = await api.post('/data/sensors', data);
  return response.data;
};

// Analytics API - New S3-based endpoints
export const getDashboardData = async (days = 7) => {
  const response = await api.get('/analytics/dashboard', {
    params: { days },
  });
  return response.data;
};

export const getAnalyticsData = async (period = '30d') => {
  const response = await api.get('/analytics/analytics', {
    params: { period },
  });
  return response.data;
};

export const getAnalyticsSummary = async (period = '30d') => {
  const response = await api.get('/analytics/summary', {
    params: { period },
  });
  return response.data;
};

export const getTrends = async (period = '30d') => {
  const response = await api.get('/analytics/trends', {
    params: { period },
  });
  return response.data;
};

export const getQualityDistribution = async (period = '30d') => {
  const response = await api.get('/analytics/distribution', {
    params: { period },
  });
  return response.data;
};

export const getDailyStats = async (period = '30d') => {
  const response = await api.get('/analytics/daily', {
    params: { period },
  });
  return response.data;
};

export const getParameterTrends = async (period = '30d') => {
  const response = await api.get('/analytics/parameter-trends', {
    params: { period },
  });
  return response.data;
};

export const getAvailableDates = async () => {
  const response = await api.get('/analytics/dates');
  return response.data;
};

export const getPredictionByIdFromS3 = async (id) => {
  const response = await api.get(`/analytics/prediction/${id}`);
  return response.data;
};

// Legacy alerts function (can be enhanced later)
export const getAlerts = async () => {
  // For now, return empty alerts - can be enhanced to check for high-risk predictions
  return { data: [] };
};

// AWS API
export const listS3Files = async (prefix = '') => {
  const response = await api.get('/aws/s3/list', {
    params: { prefix },
  });
  return response.data;
};

export const downloadFile = async (key) => {
  const response = await api.get(`/aws/s3/download/${key}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
  return response.data;
};

export default api;


/**
 * In-Memory Data Store
 * Replaces DynamoDB with simple local storage
 * (In production, you can switch to a database or S3)
 */

// In-memory storage
const predictionHistory = [];
const sensorReadings = [];

module.exports = {
  // Predictions
  predictionHistory,
  
  addPrediction(prediction) {
    predictionHistory.push(prediction);
    return prediction;
  },
  
  getPredictions(limit = 50, offset = 0) {
    return predictionHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
  },
  
  getPredictionById(id) {
    return predictionHistory.find(p => p.id === id);
  },
  
  getAllPredictions() {
    return predictionHistory;
  },
  
  // Sensor readings
  sensorReadings,
  
  addSensorReading(reading) {
    sensorReadings.push(reading);
    return reading;
  },
  
  getSensorReadings(limit = 100) {
    return sensorReadings
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },
  
  getAllSensorReadings() {
    return sensorReadings;
  },
  
  // Stats
  getStats() {
    return {
      totalPredictions: predictionHistory.length,
      totalSensorReadings: sensorReadings.length
    };
  }
};


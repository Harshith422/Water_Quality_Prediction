/**
 * Data Routes
 * Handles sensor data and analytics
 */

const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Sensor data routes
router.get('/sensors', dataController.getSensorReadings);
router.post('/sensors', dataController.addSensorReading);

// Analytics routes
router.get('/analytics/summary', dataController.getAnalyticsSummary);
router.get('/analytics/trends', dataController.getTrends);
router.get('/analytics/alerts', dataController.getAlerts);

module.exports = router;


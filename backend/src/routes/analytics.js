/**
 * Analytics Routes
 * Handles analytics and dashboard data endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Dashboard data endpoints
router.get('/dashboard', analyticsController.getDashboardData);
router.get('/dashboard/:days', analyticsController.getDashboardData);

// Analytics data endpoints
router.get('/analytics', analyticsController.getAnalyticsData);
router.get('/analytics/:period', analyticsController.getAnalyticsData);

// Specific analytics endpoints
router.get('/trends', analyticsController.getTrends);
router.get('/trends/:period', analyticsController.getTrends);

router.get('/parameter-trends', analyticsController.getParameterTrends);
router.get('/parameter-trends/:period', analyticsController.getParameterTrends);

router.get('/distribution', analyticsController.getQualityDistribution);
router.get('/distribution/:period', analyticsController.getQualityDistribution);

router.get('/daily', analyticsController.getDailyStats);
router.get('/daily/:period', analyticsController.getDailyStats);

router.get('/summary', analyticsController.getSummary);
router.get('/summary/:period', analyticsController.getSummary);

// Utility endpoints
router.get('/dates', analyticsController.getAvailableDates);
router.get('/prediction/:id', analyticsController.getPredictionById);

module.exports = router;

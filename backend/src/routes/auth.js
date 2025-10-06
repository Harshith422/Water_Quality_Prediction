/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/confirm-registration', authController.confirmRegistration);
router.post('/login', authController.login);
router.post('/complete-new-password', authController.completeNewPassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/confirm-forgot-password', authController.confirmForgotPassword);

// Protected routes (authentication required)
// router.get('/profile', authController.verifyToken, authController.getProfile);
// router.put('/profile', authController.verifyToken, authController.updateProfile);

module.exports = router;

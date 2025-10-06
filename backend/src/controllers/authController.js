/**
 * Authentication Controller
 * Handles user authentication using AWS Cognito
 */

const authService = require('../services/authService');

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    // Prepare user attributes
    const userAttributes = {};
    if (firstName) userAttributes.given_name = firstName;
    if (lastName) userAttributes.family_name = lastName;

    const result = await authService.registerUser(email, password, userAttributes);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        userSub: result.userSub
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Confirm user registration
 */
exports.confirmRegistration = async (req, res, next) => {
  try {
    const { email, confirmationCode } = req.body;

    if (!email || !confirmationCode) {
      return res.status(400).json({
        success: false,
        error: 'Email and confirmation code are required'
      });
    }

    const result = await authService.confirmRegistration(email, confirmationCode);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * User login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.loginUser(email, password);

    if (result.success) {
      res.json({
        success: true,
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType
      });
    } else if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
      res.status(200).json({
        success: false,
        challenge: 'NEW_PASSWORD_REQUIRED',
        session: result.session,
        message: result.message
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Complete new password challenge
 */
exports.completeNewPassword = async (req, res, next) => {
  try {
    const { email, newPassword, session } = req.body;

    if (!email || !newPassword || !session) {
      return res.status(400).json({
        success: false,
        error: 'Email, new password, and session are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await authService.completeNewPasswordChallenge(email, newPassword, session);

    if (result.success) {
      res.json({
        success: true,
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('New password challenge error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.forgotPassword(email);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Confirm forgot password
 */
exports.confirmForgotPassword = async (req, res, next) => {
  try {
    const { email, confirmationCode, newPassword } = req.body;

    if (!email || !confirmationCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, confirmation code, and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await authService.confirmForgotPassword(email, confirmationCode, newPassword);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Confirm forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Verify token middleware
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const result = await authService.verifyToken(token);

    if (result.success) {
      req.user = result.user;
      next();
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

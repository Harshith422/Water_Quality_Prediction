/**
 * AWS Cognito Authentication Service
 */

const { CognitoIdentityProviderClient, 
        AdminCreateUserCommand,
        AdminSetUserPasswordCommand,
        AdminConfirmSignUpCommand,
        InitiateAuthCommand,
        RespondToAuthChallengeCommand,
        SignUpCommand,
        ConfirmSignUpCommand,
        ForgotPasswordCommand,
        ConfirmForgotPasswordCommand,
        AdminDeleteUserCommand,
        ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

/**
 * Calculate SECRET_HASH for Cognito operations
 */
function calculateSecretHash(username) {
  const crypto = require('crypto');
  const message = username + CLIENT_ID;
  const hash = crypto.createHmac('sha256', CLIENT_SECRET).update(message).digest('base64');
  return hash;
}

/**
 * Register a new user
 */
exports.registerUser = async (email, password, userAttributes = {}) => {
  try {
    if (!USER_POOL_ID || !CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      SecretHash: calculateSecretHash(email),
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        ...Object.entries(userAttributes).map(([key, value]) => ({
          Name: key,
          Value: value
        }))
      ]
    };

    const command = new SignUpCommand(params);
    const result = await cognitoClient.send(command);

    return {
      success: true,
      userSub: result.UserSub,
      codeDeliveryDetails: result.CodeDeliveryDetails,
      message: 'User registered successfully. Please check your email for verification code.'
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.message || 'Registration failed'
    };
  }
};

/**
 * Confirm user registration with verification code
 */
exports.confirmRegistration = async (email, confirmationCode) => {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);

    return {
      success: true,
      message: 'Email verified successfully'
    };

  } catch (error) {
    console.error('Confirmation error:', error);
    return {
      success: false,
      error: error.message || 'Email verification failed'
    };
  }
};

/**
 * User login
 */
exports.loginUser = async (email, password) => {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(email)
      }
    };

    const command = new InitiateAuthCommand(params);
    const result = await cognitoClient.send(command);

    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return {
        success: false,
        challenge: 'NEW_PASSWORD_REQUIRED',
        session: result.Session,
        message: 'New password required'
      };
    }

    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      tokenType: result.AuthenticationResult.TokenType
    };

  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
};

/**
 * Complete new password challenge
 */
exports.completeNewPasswordChallenge = async (email, newPassword, session) => {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: session,
      ChallengeResponses: {
        USERNAME: email,
        NEW_PASSWORD: newPassword,
        SECRET_HASH: calculateSecretHash(email)
      }
    };

    const command = new RespondToAuthChallengeCommand(params);
    const result = await cognitoClient.send(command);

    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      tokenType: result.AuthenticationResult.TokenType
    };

  } catch (error) {
    console.error('New password challenge error:', error);
    return {
      success: false,
      error: error.message || 'Password update failed'
    };
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (email) => {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ForgotPasswordCommand(params);
    const result = await cognitoClient.send(command);

    return {
      success: true,
      codeDeliveryDetails: result.CodeDeliveryDetails,
      message: 'Password reset code sent to your email'
    };

  } catch (error) {
    console.error('Forgot password error:', error);
    return {
      success: false,
      error: error.message || 'Password reset request failed'
    };
  }
};

/**
 * Confirm forgot password
 */
exports.confirmForgotPassword = async (email, confirmationCode, newPassword) => {
  try {
    if (!CLIENT_ID) {
      throw new Error('Cognito configuration missing');
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
      SecretHash: calculateSecretHash(email)
    };

    const command = new ConfirmForgotPasswordCommand(params);
    await cognitoClient.send(command);

    return {
      success: true,
      message: 'Password reset successfully'
    };

  } catch (error) {
    console.error('Confirm forgot password error:', error);
    return {
      success: false,
      error: error.message || 'Password reset failed'
    };
  }
};

/**
 * Verify JWT token
 */
exports.verifyToken = async (token) => {
  try {
    // For now, we'll do basic token validation
    // In production, you should verify the JWT signature with Cognito
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    // Basic token structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid token format' };
    }

    // Decode the payload (without verification for now)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { success: false, error: 'Token expired' };
    }

    return {
      success: true,
      user: {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified
      }
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: 'Invalid token'
    };
  }
};

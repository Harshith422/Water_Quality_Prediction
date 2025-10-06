/**
 * Authentication Service
 * Handles user authentication with the backend API
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  /**
   * Register a new user
   */
  async register(email, password, firstName = '', lastName = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: data.message, userSub: data.userSub };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Confirm user registration
   */
  async confirmRegistration(email, confirmationCode) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/confirm-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          confirmationCode
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.setToken(data.accessToken);
        this.setUser({ email, sub: data.idToken });
        return { success: true, tokens: data };
      } else if (data.challenge === 'NEW_PASSWORD_REQUIRED') {
        return { 
          success: false, 
          challenge: 'NEW_PASSWORD_REQUIRED', 
          session: data.session,
          message: data.message 
        };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Complete new password challenge
   */
  async completeNewPassword(email, newPassword, session) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/complete-new-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newPassword,
          session
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.setToken(data.accessToken);
        this.setUser({ email, sub: data.idToken });
        return { success: true, tokens: data };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Confirm forgot password
   */
  async confirmForgotPassword(email, confirmationCode, newPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/confirm-forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          confirmationCode,
          newPassword
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Set user data
   */
  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Get authentication token
   */
  getToken() {
    return this.token;
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Logout user
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  /**
   * Get authorization header
   */
  getAuthHeader() {
    return this.token ? `Bearer ${this.token}` : '';
  }
}

export default new AuthService();

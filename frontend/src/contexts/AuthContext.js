/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      const token = authService.getToken();
      const userData = authService.getUser();
      
      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        setUser(authService.getUser());
        setIsAuthenticated(true);
        return { success: true };
      } else if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
        return { 
          success: false, 
          challenge: 'NEW_PASSWORD_REQUIRED', 
          session: result.session,
          message: result.message 
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const register = async (email, password, firstName = '', lastName = '') => {
    try {
      const result = await authService.register(email, password, firstName, lastName);
      return result;
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  };

  const confirmRegistration = async (email, confirmationCode) => {
    try {
      const result = await authService.confirmRegistration(email, confirmationCode);
      return result;
    } catch (error) {
      return { success: false, error: 'Confirmation failed' };
    }
  };

  const completeNewPassword = async (email, newPassword, session) => {
    try {
      const result = await authService.completeNewPassword(email, newPassword, session);
      
      if (result.success) {
        setUser(authService.getUser());
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Password update failed' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const result = await authService.forgotPassword(email);
      return result;
    } catch (error) {
      return { success: false, error: 'Password reset request failed' };
    }
  };

  const confirmForgotPassword = async (email, confirmationCode, newPassword) => {
    try {
      const result = await authService.confirmForgotPassword(email, confirmationCode, newPassword);
      return result;
    } catch (error) {
      return { success: false, error: 'Password reset failed' };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    confirmRegistration,
    completeNewPassword,
    forgotPassword,
    confirmForgotPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

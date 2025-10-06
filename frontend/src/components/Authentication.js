/**
 * Main Authentication Component
 * Handles login, register, and forgot password flows
 */

import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ConfirmRegistration from './ConfirmRegistration';

const Authentication = () => {
  const [currentView, setCurrentView] = useState('login');
  const [userEmail, setUserEmail] = useState('');

  const switchToLogin = () => {
    setCurrentView('login');
  };

  const switchToRegister = () => {
    setCurrentView('register');
  };

  const switchToForgotPassword = () => {
    setCurrentView('forgot-password');
  };

  const handleConfirmRegistration = (email) => {
    setUserEmail(email);
    setCurrentView('confirm-registration');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        );
      case 'register':
        return (
          <Register
            onSwitchToLogin={switchToLogin}
            onConfirmRegistration={handleConfirmRegistration}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPassword
            onSwitchToLogin={switchToLogin}
            onSwitchToRegister={switchToRegister}
          />
        );
      case 'confirm-registration':
        return (
          <ConfirmRegistration
            email={userEmail}
            onSwitchToLogin={switchToLogin}
            onSwitchToRegister={switchToRegister}
          />
        );
      default:
        return (
          <Login
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        );
    }
  };

  return (
    <div className="authentication-wrapper">
      {renderCurrentView()}
    </div>
  );
};

export default Authentication;

/**
 * Confirm Registration Component
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const ConfirmRegistration = ({ email, onSwitchToLogin, onSwitchToRegister }) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { confirmRegistration } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await confirmRegistration(email, confirmationCode);
      
      if (result.success) {
        toast.success('Email verified successfully! You can now sign in.');
        onSwitchToLogin();
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch (error) {
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Verify Your Email</h2>
          <p>Enter the verification code sent to {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="confirmationCode">Verification Code</label>
            <input
              type="text"
              id="confirmationCode"
              name="confirmationCode"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
              placeholder="Enter verification code"
              maxLength="6"
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Didn't receive the code?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToRegister}
            >
              Try again
            </button>
          </p>
          <p>
            Already verified?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRegistration;

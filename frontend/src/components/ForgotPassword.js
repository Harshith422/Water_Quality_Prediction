/**
 * Forgot Password Component
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const ForgotPassword = ({ onSwitchToLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setEmailSent(true);
        toast.success('Password reset code sent to your email!');
      } else {
        toast.error(result.error || 'Failed to send reset code');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Check Your Email</h2>
            <p>We've sent a password reset code to {email}</p>
          </div>
          <div className="auth-footer">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Try a different email
            </button>
            <p>
              Remember your password?{' '}
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
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Forgot Password</h2>
          <p>Enter your email to receive a reset code</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToRegister}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

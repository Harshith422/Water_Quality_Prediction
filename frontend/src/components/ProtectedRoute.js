/**
 * Protected Route Component
 * Wraps components that require authentication
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Authentication from './Authentication';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Authentication />;
  }

  return children;
};

export default ProtectedRoute;

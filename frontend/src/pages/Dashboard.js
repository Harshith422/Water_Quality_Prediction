import React, { useState, useEffect } from 'react';
import { FaWater, FaExclamationTriangle, FaCheckCircle, FaChartLine } from 'react-icons/fa';
import { getDashboardData, getAnalyticsSummary } from '../services/api';
import { toast } from 'react-toastify';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      
      const [dashboardRes, summaryRes] = await Promise.all([
        getDashboardData(7),
        getAnalyticsSummary('7d')
      ]);

      console.log('📊 Dashboard response:', dashboardRes);
      console.log('📈 Summary response:', summaryRes);

      setDashboardData(dashboardRes.data);
      setSummary(summaryRes.data);
      setLoading(false);
      
      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <div className="dashboard-header">
        <h1>Water Quality Dashboard</h1>
        <p>Real-time monitoring and analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card safe">
          <div className="card-icon">
            <FaCheckCircle />
          </div>
          <div className="card-content">
            <h3>{summary?.summary?.safe || 0}</h3>
            <p>Safe Readings</p>
          </div>
        </div>

        <div className="summary-card unsafe">
          <div className="card-icon">
            <FaExclamationTriangle />
          </div>
          <div className="card-content">
            <h3>{summary?.summary?.unsafe || 0}</h3>
            <p>Unsafe Readings</p>
          </div>
        </div>

        <div className="summary-card total">
          <div className="card-icon">
            <FaWater />
          </div>
          <div className="card-content">
            <h3>{summary?.totalPredictions || 0}</h3>
            <p>Total Predictions</p>
          </div>
        </div>

        <div className="summary-card trends">
          <div className="card-icon">
            <FaChartLine />
          </div>
          <div className="card-content">
            <h3>{summary?.summary?.highRisk || 0}</h3>
            <p>High Risk Alerts</p>
          </div>
        </div>
      </div>

      {/* Average Parameters */}
      <div className="parameters-section">
        <h2>Average Water Parameters</h2>
        <div className="parameters-grid">
          <div className="parameter-card">
            <h4>pH Level</h4>
            <p className="parameter-value">{dashboardData?.averageParameters?.pH || 'N/A'}</p>
            <span className="parameter-status">
              {dashboardData?.averageParameters?.pH >= 6.5 && dashboardData?.averageParameters?.pH <= 8.5 ? '✓ Normal' : '⚠ Abnormal'}
            </span>
          </div>

          <div className="parameter-card">
            <h4>Temperature (°C)</h4>
            <p className="parameter-value">{dashboardData?.averageParameters?.Temperature || 'N/A'}</p>
            <span className="parameter-status">
              {dashboardData?.averageParameters?.Temperature >= 15 && dashboardData?.averageParameters?.Temperature <= 30 ? '✓ Normal' : '⚠ Abnormal'}
            </span>
          </div>

          <div className="parameter-card">
            <h4>TDS (ppm)</h4>
            <p className="parameter-value">{dashboardData?.averageParameters?.TDS || 'N/A'}</p>
            <span className="parameter-status">
              {dashboardData?.averageParameters?.TDS < 500 ? '✓ Normal' : '⚠ Abnormal'}
            </span>
          </div>

          <div className="parameter-card">
            <h4>Turbidity (NTU)</h4>
            <p className="parameter-value">{dashboardData?.averageParameters?.Turbidity || 'N/A'}</p>
            <span className="parameter-status">
              {dashboardData?.averageParameters?.Turbidity < 5 ? '✓ Normal' : '⚠ Abnormal'}
            </span>
          </div>

          <div className="parameter-card">
            <h4>Dissolved Oxygen (mg/L)</h4>
            <p className="parameter-value">{dashboardData?.averageParameters?.DO || 'N/A'}</p>
            <span className="parameter-status">
              {dashboardData?.averageParameters?.DO > 5 ? '✓ Normal' : '⚠ Abnormal'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;


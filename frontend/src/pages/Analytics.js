import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getAnalyticsData, getQualityDistribution, getDailyStats } from '../services/api';
import { toast } from 'react-toastify';
import './Analytics.css';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const Analytics = () => {
  const [period, setPeriod] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, distributionRes, dailyRes] = await Promise.all([
        getAnalyticsData(period),
        getQualityDistribution(period),
        getDailyStats(period)
      ]);

      setAnalyticsData(analyticsRes.data);
      setDistribution(distributionRes.data);
      setDailyStats(dailyRes.data.dailyStats || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
      setLoading(false);
    }
  };


  const riskDistributionData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [
      {
        data: [
          distribution?.riskDistribution?.Low || 0,
          distribution?.riskDistribution?.Medium || 0,
          distribution?.riskDistribution?.High || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const qualityDistributionData = {
    labels: ['Safe', 'Unsafe'],
    datasets: [
      {
        data: [
          distribution?.qualityDistribution?.Safe || 0,
          distribution?.qualityDistribution?.Unsafe || 0,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const dailyStatsChartData = {
    labels: dailyStats.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Predictions',
        data: dailyStats.map(d => d.count),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Average Confidence',
        data: dailyStats.map(d => d.averageConfidence),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="analytics-container fade-in">
      <div className="analytics-header">
        <h1>Advanced Analytics</h1>
        <p>Comprehensive water quality insights and trends</p>
      </div>

      <div className="period-selector">
        <button
          className={period === '24h' ? 'period-btn active' : 'period-btn'}
          onClick={() => setPeriod('24h')}
        >
          24 Hours
        </button>
        <button
          className={period === '7d' ? 'period-btn active' : 'period-btn'}
          onClick={() => setPeriod('7d')}
        >
          7 Days
        </button>
        <button
          className={period === '30d' ? 'period-btn active' : 'period-btn'}
          onClick={() => setPeriod('30d')}
        >
          30 Days
        </button>
        <button
          className={period === '90d' ? 'period-btn active' : 'period-btn'}
          onClick={() => setPeriod('90d')}
        >
          90 Days
        </button>
      </div>

      <div className="analytics-grid">
        <div className="chart-card card">
          <h3>Quality Distribution</h3>
          <Doughnut data={qualityDistributionData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        <div className="chart-card card">
          <h3>Risk Distribution</h3>
          <Doughnut data={riskDistributionData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        <div className="chart-card card full-width">
          <h3>Daily Statistics</h3>
          <Line data={dailyStatsChartData} options={{ 
            responsive: true, 
            maintainAspectRatio: true,
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                  drawOnChartArea: false,
                },
              },
            },
          }} />
        </div>

        <div className="stats-card card">
          <h3>Summary Statistics</h3>
          <div className="stats-list">
            <div className="stat-item">
              <span className="stat-label">Total Predictions</span>
              <span className="stat-value">{analyticsData?.totalPredictions || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Safe Readings</span>
              <span className="stat-value safe">{analyticsData?.summary?.safe || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Unsafe Readings</span>
              <span className="stat-value unsafe">{analyticsData?.summary?.unsafe || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Confidence</span>
              <span className="stat-value">
                {analyticsData?.summary?.averageConfidence || 0}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">High Risk Alerts</span>
              <span className="stat-value unsafe">{analyticsData?.summary?.highRisk || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;


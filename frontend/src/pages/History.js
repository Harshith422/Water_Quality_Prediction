import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import { getPredictionHistory } from '../services/api';
import { toast } from 'react-toastify';
import './History.css';

const History = () => {
  const [predictions, setPredictions] = useState([]);
  const [filteredPredictions, setFilteredPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    filterPredictions();
  }, [searchTerm, filterStatus, predictions]);

  const fetchHistory = async () => {
    try {
      const response = await getPredictionHistory(100, 0);
      setPredictions(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load prediction history');
      setLoading(false);
    }
  };

  const filterPredictions = () => {
    let filtered = predictions;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.waterQuality?.toLowerCase() === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.waterQuality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.riskLevel?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPredictions(filtered);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Water Quality', 'Risk Level', 'Confidence'];
    const rows = filteredPredictions.map(p => [
      p.id,
      new Date(p.timestamp).toLocaleString(),
      p.waterQuality,
      p.riskLevel,
      p.confidence?.quality || 0
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water-quality-history-${Date.now()}.csv`;
    a.click();

    toast.success('History exported successfully!');
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="history-container fade-in">
      <div className="history-header">
        <h1>Prediction History</h1>
        <p>View and analyze past water quality predictions</p>
      </div>

      <div className="history-controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search predictions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="safe">Safe</option>
            <option value="unsafe">Unsafe</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={exportToCSV}>
          <FaDownload /> Export CSV
        </button>
      </div>

      <div className="history-stats">
        <div className="stat-box">
          <span className="stat-number">{filteredPredictions.length}</span>
          <span className="stat-label">Total Records</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">
            {filteredPredictions.filter(p => p.waterQuality === 'Safe').length}
          </span>
          <span className="stat-label">Safe</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">
            {filteredPredictions.filter(p => p.waterQuality === 'Unsafe').length}
          </span>
          <span className="stat-label">Unsafe</span>
        </div>
      </div>

      <div className="history-table-container card">
        {filteredPredictions.length === 0 ? (
          <div className="no-data">
            <p>No predictions found</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Water Quality</th>
                <th>Risk Level</th>
                <th>Confidence</th>
                <th>pH</th>
                <th>Temperature</th>
                <th>TDS</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((prediction) => (
                <tr key={prediction.id}>
                  <td>{new Date(prediction.timestamp).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${prediction.waterQuality?.toLowerCase()}`}>
                      {prediction.waterQuality}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${prediction.riskLevel?.toLowerCase()}`}>
                      {prediction.riskLevel}
                    </span>
                  </td>
                  <td>{prediction.confidence?.quality || 0}%</td>
                  <td>{prediction.sensorData?.pH || 'N/A'}</td>
                  <td>{prediction.sensorData?.Temperature || 'N/A'}°C</td>
                  <td>{prediction.sensorData?.TDS || 'N/A'}</td>
                  <td>
                    <button className="btn-view" onClick={() => toast.info('View details feature coming soon!')}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default History;


import React, { useState } from 'react';
import { FaSave, FaServer, FaAws, FaBell, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    awsRegion: 'us-east-1',
    s3Bucket: 'water-quality-images',
    dynamoTable: 'sensor-readings',
    alertsEnabled: true,
    emailNotifications: false,
    thresholds: {
      pH: { min: 6.5, max: 8.5 },
      temperature: { min: 15, max: 30 },
      tds: { max: 500 },
      turbidity: { max: 5 },
      dissolvedOxygen: { min: 5 }
    }
  });

  const handleChange = (section, field, value) => {
    if (section === 'thresholds') {
      setSettings({
        ...settings,
        thresholds: {
          ...settings.thresholds,
          [field]: value
        }
      });
    } else {
      setSettings({
        ...settings,
        [field]: value
      });
    }
  };

  const handleSave = () => {
    localStorage.setItem('waterQualitySettings', JSON.stringify(settings));
    toast.success('Settings saved successfully!');
  };

  const handleReset = () => {
    localStorage.removeItem('waterQualitySettings');
    window.location.reload();
    toast.info('Settings reset to defaults');
  };

  return (
    <div className="settings-container fade-in">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure system preferences and thresholds</p>
      </div>

      <div className="settings-content">
        {/* API Configuration */}
        <div className="settings-section card">
          <div className="section-header">
            <FaServer className="section-icon" />
            <h3>API Configuration</h3>
          </div>
          <div className="settings-group">
            <label>API Base URL</label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => handleChange(null, 'apiUrl', e.target.value)}
              placeholder="http://localhost:5000/api"
            />
          </div>
        </div>

        {/* AWS Configuration */}
        <div className="settings-section card">
          <div className="section-header">
            <FaAws className="section-icon" />
            <h3>AWS Configuration</h3>
          </div>
          <div className="settings-group">
            <label>AWS Region</label>
            <select
              value={settings.awsRegion}
              onChange={(e) => handleChange(null, 'awsRegion', e.target.value)}
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="ap-south-1">Asia Pacific (Mumbai)</option>
            </select>
          </div>
          <div className="settings-group">
            <label>S3 Bucket Name</label>
            <input
              type="text"
              value={settings.s3Bucket}
              onChange={(e) => handleChange(null, 's3Bucket', e.target.value)}
              placeholder="water-quality-images"
            />
          </div>
          <div className="settings-group">
            <label>DynamoDB Table Name</label>
            <input
              type="text"
              value={settings.dynamoTable}
              onChange={(e) => handleChange(null, 'dynamoTable', e.target.value)}
              placeholder="sensor-readings"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section card">
          <div className="section-header">
            <FaBell className="section-icon" />
            <h3>Notifications</h3>
          </div>
          <div className="settings-group checkbox">
            <input
              type="checkbox"
              id="alerts"
              checked={settings.alertsEnabled}
              onChange={(e) => handleChange(null, 'alertsEnabled', e.target.checked)}
            />
            <label htmlFor="alerts">Enable Real-time Alerts</label>
          </div>
          <div className="settings-group checkbox">
            <input
              type="checkbox"
              id="email"
              checked={settings.emailNotifications}
              onChange={(e) => handleChange(null, 'emailNotifications', e.target.checked)}
            />
            <label htmlFor="email">Enable Email Notifications</label>
          </div>
        </div>

        {/* Water Quality Thresholds */}
        <div className="settings-section card">
          <div className="section-header">
            <FaShieldAlt className="section-icon" />
            <h3>Water Quality Thresholds</h3>
          </div>

          <div className="threshold-group">
            <h4>pH Level</h4>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Minimum</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.thresholds.pH.min}
                  onChange={(e) => handleChange('thresholds', 'pH', {
                    ...settings.thresholds.pH,
                    min: parseFloat(e.target.value)
                  })}
                />
              </div>
              <div className="threshold-input">
                <label>Maximum</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.thresholds.pH.max}
                  onChange={(e) => handleChange('thresholds', 'pH', {
                    ...settings.thresholds.pH,
                    max: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>

          <div className="threshold-group">
            <h4>Temperature (°C)</h4>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Minimum</label>
                <input
                  type="number"
                  value={settings.thresholds.temperature.min}
                  onChange={(e) => handleChange('thresholds', 'temperature', {
                    ...settings.thresholds.temperature,
                    min: parseFloat(e.target.value)
                  })}
                />
              </div>
              <div className="threshold-input">
                <label>Maximum</label>
                <input
                  type="number"
                  value={settings.thresholds.temperature.max}
                  onChange={(e) => handleChange('thresholds', 'temperature', {
                    ...settings.thresholds.temperature,
                    max: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>

          <div className="threshold-group">
            <h4>TDS (ppm)</h4>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Maximum</label>
                <input
                  type="number"
                  value={settings.thresholds.tds.max}
                  onChange={(e) => handleChange('thresholds', 'tds', {
                    max: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>

          <div className="threshold-group">
            <h4>Turbidity (NTU)</h4>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Maximum</label>
                <input
                  type="number"
                  value={settings.thresholds.turbidity.max}
                  onChange={(e) => handleChange('thresholds', 'turbidity', {
                    max: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>

          <div className="threshold-group">
            <h4>Dissolved Oxygen (mg/L)</h4>
            <div className="threshold-inputs">
              <div className="threshold-input">
                <label>Minimum</label>
                <input
                  type="number"
                  value={settings.thresholds.dissolvedOxygen.min}
                  onChange={(e) => handleChange('thresholds', 'dissolvedOxygen', {
                    min: parseFloat(e.target.value)
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <FaSave /> Save Settings
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;


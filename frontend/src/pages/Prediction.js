import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaTimes } from 'react-icons/fa';
import { predict } from '../services/api';
import { toast } from 'react-toastify';
import './Prediction.css';

const Prediction = () => {
  const [imageFile, setImageFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCsvUpload, setShowCsvUpload] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const onImageDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowModal(true);
  }, []);

  const handleModalYes = () => {
    setShowCsvUpload(true);
    setShowModal(false);
  };

  const handleModalNo = () => {
    setCsvFile(null);
    setShowCsvUpload(false);
    setShowModal(false);
  };

  const onCsvDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setCsvFile(file);
  }, []);

  const imageDropzone = useDropzone({
    onDrop: onImageDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1
  });

  const csvDropzone = useDropzone({
    onDrop: onCsvDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleSubmit = async () => {
    if (!imageFile && !csvFile) {
      toast.error('Please upload at least an image or CSV file');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      if (csvFile) formData.append('csv', csvFile);

      const response = await predict(formData);
      setResult(response.prediction);
      
      let mode = 'both';
      if (imageFile && csvFile) mode = 'Image + Sensor';
      else if (imageFile) mode = 'Image Only';
      else mode = 'Sensor Only';
      
      toast.success(`Prediction completed successfully! (${mode})`);
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(error.response?.data?.error || 'Failed to make prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setCsvFile(null);
    setImagePreview(null);
    setResult(null);
    setShowCsvUpload(true);
    setShowModal(false);
  };

  const getStatusColor = (status) => {
    if (status === 'Safe') return '#059669';
    if (status === 'Unsafe') return '#dc2626';
    return '#6b7280';
  };

  const getRiskColor = (risk) => {
    if (risk === 'Low') return '#3b82f6';
    if (risk === 'Medium') return '#f59e0b';
    if (risk === 'High') return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="prediction-container fade-in">
      <div className="prediction-header">
        <h1>Water Quality Prediction</h1>
        <p>Upload an image, a CSV, or both.</p>
      </div>

      <div className="prediction-content">
        <div className="mode-info">
          <p>
            <strong>Current Mode:</strong>{' '}
            {imageFile && csvFile && 'Hybrid Analysis (Image + Sensor Data)'}
            {imageFile && !csvFile && 'Image Analysis Only'}
            {!imageFile && csvFile && 'Sensor Data Analysis Only'}
            {!imageFile && !csvFile && 'Upload at least one file to start'}
          </p>
        </div>

        <div className={`upload-section ${!showCsvUpload ? 'single' : ''}`}>
          <div className="upload-card">
            <h3>
              Upload Water Image
            </h3>
            <div {...imageDropzone.getRootProps()} className="dropzone">
              <input {...imageDropzone.getInputProps()} />
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setImagePreview(null);
                    setShowCsvUpload(true);
                    setShowModal(false);
                  }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className="dropzone-content">
                  <FaUpload className="upload-icon" />
                  <p>Drag & drop an image here, or click to select</p>
                  <span className="file-types">Supported: JPG, PNG</span>
                </div>
              )}
            </div>
          </div>

          {showCsvUpload && (
            <div className="upload-card">
              <h3>
                Upload Sensor Data (CSV)
              </h3>
              <div {...csvDropzone.getRootProps()} className="dropzone">
                <input {...csvDropzone.getInputProps()} />
                {csvFile ? (
                  <div className="file-selected">
                    <div>
                      <p className="file-name">{csvFile.name}</p>
                      <p className="file-size">{(csvFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCsvFile(null);
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <div className="dropzone-content">
                    <FaUpload className="upload-icon" />
                    <p>Drag & drop a CSV file here, or click to select</p>
                    <span className="file-types">Supported: CSV</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={(!imageFile && !csvFile) || loading}
            >
              {loading ? 'Analyzing...' : ((!imageFile && !csvFile) ? 'Upload a File First' : 'Predict Water Quality')}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} disabled={loading}>
              Reset
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-section card">
            <div className="spinner"></div>
            <p>Analyzing water quality...</p>
          </div>
        )}

        {result && !loading && (
          <div className="result-section card fade-in">
            <h2>Prediction Results</h2>

            <div className="result-summary">
              <div className="result-card">
                <h3>Water Quality</h3>
                <p className="result-value" style={{ color: getStatusColor(result.waterQuality) }}>
                  {result.waterQuality}
                </p>
                <span className={`badge badge-${result.waterQuality.toLowerCase()}`}>
                  {result.waterQuality}
                </span>
              </div>

              <div className="result-card">
                <h3>Risk Level</h3>
                <p className="result-value" style={{ color: getRiskColor(result.riskLevel) }}>
                  {result.riskLevel}
                </p>
                <span className={`badge badge-${result.riskLevel.toLowerCase()}`}>
                  {result.riskLevel}
                </span>
              </div>

              <div className="result-card">
                <h3>Confidence</h3>
                <p className="result-value">{result.confidence?.quality || 0}%</p>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${result.confidence?.quality || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {result.parameters && (
              <div className="parameters-result">
                <h3>Water Parameters</h3>
                <div className="parameters-list">
                  {Object.entries(result.parameters).map(([key, param]) => (
                    <div key={key} className="parameter-item">
                      <span className="param-name">{key}</span>
                      <span className="param-value">{param.value}</span>
                      <span className={`param-status ${param.status.toLowerCase()}`}>
                        {param.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => window.print()}>
                Download Report
              </button>
            </div>
          </div>
        )}

        {/* Custom Modal */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Upload CSV File?</h3>
              <p>Do you also want to upload a CSV file for sensor data analysis?</p>
              <div className="modal-buttons">
                <button className="btn btn-primary" onClick={handleModalYes}>
                  Yes
                </button>
                <button className="btn btn-secondary" onClick={handleModalNo}>
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Prediction;


/**
 * Prediction Controller
 * Handles prediction logic using ML model
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const awsService = require('../services/awsService');
const dataStore = require('../services/dataStore');
const predictionStorage = require('../services/predictionStorageService');

/**
 * Make prediction using uploaded image and/or sensor data
 */
exports.predict = async (req, res, next) => {
  try {
    const { image, csv } = req.files || {};

    // Determine prediction mode
    let predictionMode = 'both';
    let scriptName = 'predict.py';
    let scriptArgs = [];

    if (!image && !csv) {
      return res.status(400).json({
        error: 'Please upload at least an image or CSV file'
      });
    }

    if (image && csv) {
      // Both image and sensor data - use hybrid analysis
      predictionMode = 'hybrid';
      scriptName = 'predict_hybrid.py';  // Uses sensor data + image analysis
      scriptArgs = [image[0].path, csv[0].path];
      console.log('Using hybrid mode: sensor data + image analysis');
    } else if (image && !csv) {
      // Image only
      predictionMode = 'image_only';
      scriptName = 'predict_image_only.py';
      scriptArgs = [image[0].path];
    } else if (!image && csv) {
      // Sensor only
      predictionMode = 'sensor_only';
      scriptName = 'predict_sensor_only.py';
      scriptArgs = [csv[0].path];
    }

    // Call Python prediction script using child_process
    const scriptPath = path.join(__dirname, '../../python-scripts', scriptName);
    const pythonPath = process.env.PYTHON_PATH || 'python';

    console.log(`Running Python script: ${scriptName}`);
    console.log(`Script path: ${scriptPath}`);
    console.log(`Arguments: ${scriptArgs.join(' ')}`);

    const results = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Prediction timeout - script took too long'));
      }, 30000); // 30 second timeout

      const python = spawn(pythonPath, [scriptPath, ...scriptArgs], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          console.error('Python script error - exit code:', code);
          console.error('Python stderr:', stderr);
          reject(new Error('Prediction failed: ' + (stderr || 'Unknown error')));
        } else {
          try {
            const jsonResult = JSON.parse(stdout.trim());
            console.log('Python script completed successfully');
            console.log('Results:', jsonResult);
            resolve([jsonResult]);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw output:', stdout);
            reject(new Error('Invalid prediction result format'));
          }
        }
      });

      python.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Python process error:', error);
        reject(new Error('Prediction failed: ' + error.message));
      });
    });

    const prediction = results[0];
    
    // Validate prediction result
    if (!prediction || typeof prediction !== 'object') {
      throw new Error('Invalid prediction result format');
    }

    // Create prediction record
    const predictionRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      waterQuality: prediction.water_quality,
      riskLevel: prediction.risk_level,
      confidence: prediction.confidence,
      sensorData: prediction.sensor_readings,
      imageUrl: null,
      parameters: prediction.parameters,
      method: predictionMode
    };

    // Try to upload image to AWS S3 (optional - if configured)
    if (image) {
      try {
        const s3ImageUrl = await awsService.uploadToS3(image[0].path, `predictions/${predictionRecord.id}.jpg`);
        predictionRecord.imageUrl = s3ImageUrl;
        console.log('✓ Image uploaded to S3');
      } catch (err) {
        console.log('S3 upload skipped (not configured or failed):', err.message);
        predictionRecord.imageUrl = null;
      }
    }
    
    // Save to local data store (backup storage)
    dataStore.addPrediction(predictionRecord);
    console.log(`✓ Prediction saved locally (Total: ${dataStore.getAllPredictions().length})`);
    
    // Store prediction data in S3 (primary storage for analytics)
    try {
      const storageResult = await predictionStorage.storePrediction(predictionRecord);
      if (storageResult.success) {
        console.log('✓ Prediction data stored in S3:', storageResult.storagePaths);
      } else {
        console.log('⚠️ S3 storage skipped:', storageResult.reason || storageResult.error);
      }
    } catch (err) {
      console.log('S3 prediction storage failed:', err.message);
      // Continue without failing the request
    }

    // Clean up uploaded files
    try {
      if (image) await fs.unlink(image[0].path);
      if (csv) await fs.unlink(csv[0].path);
    } catch (err) {
      console.log('File cleanup error:', err.message);
    }

    res.json({
      success: true,
      prediction: predictionRecord
    });

  } catch (error) {
    console.error('Prediction error:', error);
    // Clean up files on error
    try {
      if (req.files) {
        if (req.files.image) await fs.unlink(req.files.image[0].path).catch(() => {});
        if (req.files.csv) await fs.unlink(req.files.csv[0].path).catch(() => {});
      }
    } catch (err) {
      // Ignore cleanup errors
    }
    next(error);
  }
};

/**
 * Batch prediction for multiple images
 */
exports.batchPredict = async (req, res, next) => {
  try {
    const { images, csv } = req.files;

    if (!images || !csv) {
      return res.status(400).json({
        error: 'Images and CSV file are required'
      });
    }

    const predictions = [];
    const csvPath = csv[0].path;

    for (const image of images) {
      const imagePath = image.path;

      const scriptPath = path.join(__dirname, '../../python-scripts', 'predict.py');
      const pythonPath = process.env.PYTHON_PATH || 'python';

      const results = await new Promise((resolve, reject) => {
        const python = spawn(pythonPath, [scriptPath, imagePath, csvPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          } else {
            try {
              const jsonResult = JSON.parse(stdout.trim());
              resolve([jsonResult]);
            } catch (parseError) {
              reject(new Error('Invalid prediction result format'));
            }
          }
        });

        python.on('error', (error) => {
          reject(error);
        });
      });

      const prediction = results[0];
      const s3ImageUrl = await awsService.uploadToS3(imagePath, `predictions/${uuidv4()}.jpg`);

      const predictionRecord = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        waterQuality: prediction.water_quality,
        riskLevel: prediction.risk_level,
        confidence: prediction.confidence,
        imageUrl: s3ImageUrl
      };

      predictions.push(predictionRecord);
      await fs.unlink(imagePath);
    }

    await fs.unlink(csvPath);

    res.json({
      success: true,
      count: predictions.length,
      predictions
    });

  } catch (error) {
    console.error('Batch prediction error:', error);
    next(error);
  }
};

/**
 * Get prediction history (from local data store - no DynamoDB!)
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Use local data store (primary storage)
    const history = dataStore.getPredictions(parseInt(limit), parseInt(offset));
    const total = dataStore.getAllPredictions().length;

    res.json({
      success: true,
      count: history.length,
      total: total,
      data: history,
      source: 'local'
    });

  } catch (error) {
    console.error('Get history error:', error);
    next(error);
  }
};

/**
 * Get prediction by ID (from local data store)
 */
exports.getPredictionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prediction = dataStore.getPredictionById(id);

    if (!prediction) {
      return res.status(404).json({
        error: 'Prediction not found'
      });
    }

    res.json({
      success: true,
      data: prediction,
      source: 'local'
    });

  } catch (error) {
    console.error('Get prediction error:', error);
    next(error);
  }
};


/**
 * Prediction Routes
 * Handles water quality prediction requests
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const predictionController = require('../controllers/predictionController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      // Accept images only
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
    } else if (file.fieldname === 'csv') {
      // Accept CSV only
      if (!file.originalname.match(/\.(csv)$/)) {
        return cb(new Error('Only CSV files are allowed!'), false);
      }
    }
    cb(null, true);
  }
});

// Routes
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'csv', maxCount: 1 }
  ]),
  predictionController.predict
);

router.post(
  '/batch',
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'csv', maxCount: 1 }
  ]),
  predictionController.batchPredict
);

router.get('/history', predictionController.getHistory);

router.get('/history/:id', predictionController.getPredictionById);

module.exports = router;


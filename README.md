# Deep Learning for Water Quality Monitoring

## 🔷 Project Overview

**Title:** Deep Learning for Water Quality Monitoring Using Sensor & Image Data

**Goal:** Build a full-stack AI system that predicts water quality using sensor data (pH, TDS, temperature, turbidity, DO) and image data (microscopic/environmental images).

### ⭐ Key Highlights

- 🤖 **AI-Powered**: CNN + LSTM fusion model for accurate predictions
- 🌐 **Full-Stack**: Complete end-to-end solution (ML → API → Dashboard)
- ☁️ **Cloud-Ready**: AWS S3 & DynamoDB integration
- 📊 **Real-time**: Live monitoring and instant predictions
- 📱 **Responsive**: Beautiful, modern UI that works on all devices
- 🔒 **Secure**: Industry-standard security practices

## 🛠️ Technology Stack

- **Frontend:** React.js (Dashboard for visualization)
- **Backend:** Node.js/Express (Model Inference + API)
- **ML Framework:** TensorFlow/Keras (CNN + LSTM Fusion Model)
- **Cloud:** AWS (S3, DynamoDB, EC2, Cognito)
- **Visualization:** Chart.js, Recharts

## 📁 Project Structure

```
FSD/
├── datasets/                    # Raw datasets
├── ml-models/                   # Machine Learning models
│   ├── data_preprocessing/
│   ├── models/
│   ├── training/
│   └── saved_models/
├── backend/                     # Node.js/Express API
│   ├── src/
│   ├── config/
│   └── utils/
├── frontend/                    # React.js Dashboard
│   ├── src/
│   ├── public/
│   └── components/
├── aws-integration/             # AWS scripts
└── docs/                        # Documentation
```

## 🚀 Quick Start

### Automated Installation

**Windows:**
```bash
install.bat
```

**macOS/Linux:**
```bash
chmod +x install.sh
./install.sh
```

### Manual Installation

**Prerequisites:**
- Node.js (v16+)
- Python (v3.8+)
- AWS Account (optional for local testing)

**Steps:**

1. **Install all dependencies:**
   ```bash
   # ML Models
   cd ml-models
   pip install -r requirements.txt
   
   # Backend
   cd ../backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Train the ML model (or use pre-trained):**
   ```bash
   cd ml-models/training
   python train_fusion_model.py
   ```

3. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on: http://localhost:5000

4. **Start frontend (new terminal):**
   ```bash
   cd frontend
   npm start
   ```
   Frontend opens at: http://localhost:3000

### 🎯 First Prediction

1. Open http://localhost:3000
2. Navigate to "Predict" page
3. Upload a water image (JPG/PNG)
4. Upload sensor data CSV
5. Click "Predict Water Quality"
6. View results!

📖 **For detailed instructions, see:** [QUICKSTART.md](QUICKSTART.md)

## 📊 Datasets Used

1. **Dataset 1 – Sensor-Only:** IoT-based Fish Pond Water Quality
2. **Dataset 2 – Sensor + Image:** Fishpond Visual Condition Dataset
3. **Dataset 3 – IoT Sensor:** Additional parameters

## 🔄 Workflow

1. User uploads image + CSV via React dashboard
2. Backend receives and validates inputs
3. Backend fetches data from AWS S3 and DynamoDB
4. CNN + LSTM fusion model performs inference
5. Prediction (Safe/Unsafe + Risk Level) returned
6. Results stored in DynamoDB
7. Dashboard visualizes trends and alerts

## 📈 Model Architecture

- **CNN:** Extracts spatial features from water images
- **LSTM:** Learns temporal trends in sensor data
- **Fusion Layer:** Combines CNN + LSTM outputs

## 🔑 Environment Variables

Create `.env` files in backend and aws-integration directories:

```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=water-quality-images
DYNAMODB_TABLE_NAME=sensor-readings
```

## 📚 Documentation

Comprehensive documentation is available:

- 📖 [**Quick Start Guide**](QUICKSTART.md) - Get started in 10 minutes
- 🚀 [**Deployment Guide**](DEPLOYMENT.md) - Production deployment instructions
- 📡 [**API Documentation**](API_DOCUMENTATION.md) - Complete API reference
- 📂 [**Project Structure**](PROJECT_STRUCTURE.md) - Codebase organization
- ✨ [**Features List**](FEATURES.md) - All 100+ features

## 🎯 Key Features

### Machine Learning
- ✅ CNN + LSTM Fusion Model
- ✅ Transfer Learning (MobileNetV2)
- ✅ Multi-output Classification
- ✅ Real-time Predictions

### Dashboard
- ✅ Interactive Charts & Visualizations
- ✅ Real-time Monitoring
- ✅ Alert System
- ✅ Historical Analysis

### API
- ✅ RESTful Endpoints
- ✅ File Upload Support
- ✅ Batch Processing
- ✅ AWS Integration

### Deployment
- ✅ Docker Ready
- ✅ EC2 Compatible
- ✅ S3 + CloudFront
- ✅ Auto-scaling Ready

## 🔧 AWS Setup

1. **Configure AWS credentials:**
   ```bash
   cd aws-integration
   # Edit .env with your AWS credentials
   ```

2. **Run setup script:**
   ```bash
   python setup_aws.py
   ```

3. **Upload data (optional):**
   ```bash
   python upload_data.py
   ```

## 🐛 Troubleshooting

### Backend Issues
- Verify Python is in PATH
- Check port 5000 is available
- Ensure model files exist

### Frontend Issues
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall
- Check port 3000 is available

### Model Issues
- Verify TensorFlow installation
- Check GPU availability (optional)
- Review training logs

📖 **See:** [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions and support:
- Create an issue in the repository
- Check documentation files
- Review API documentation

## 🙏 Acknowledgments

- TensorFlow & Keras teams
- React.js community
- AWS documentation
- Open source contributors

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

---

**Built with ❤️ for better water quality monitoring**

**Last Updated:** October 6, 2025


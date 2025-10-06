# Test Samples for Water Quality Prediction

Use these sample files to test the water quality prediction system.

## 📁 Available Files

### 1. **sample_sensor_data.csv** - Safe Water Sample
- **Use for:** Sensor-only or combined prediction
- **Expected Result:** ✅ Safe water, Low risk
- **Parameters:**
  - pH: 7.2 (Normal)
  - Temperature: 24.5°C (Normal)
  - TDS: 320 ppm (Normal)
  - Turbidity: 2.1 NTU (Normal)
  - DO: 6.5 mg/L (Normal)

### 2. **unsafe_water_sample.csv** - Unsafe Water Sample
- **Use for:** Sensor-only or combined prediction
- **Expected Result:** ⚠️ Unsafe water, High risk
- **Parameters:**
  - pH: 9.2 (Abnormal - too high)
  - Temperature: 32.5°C (Abnormal - too high)
  - TDS: 720 ppm (Abnormal - too high)
  - Turbidity: 8.1 NTU (Abnormal - too high)
  - DO: 3.2 mg/L (Abnormal - too low)

### 3. **sample_water_image.jpg** - Water Sample Image
- **Use for:** Image-only or combined prediction
- **Source:** Fishpond visual dataset

### 4. **sample_water_image_2.jpg** - Another Water Sample
- **Use for:** Image-only or combined prediction
- **Source:** Fishpond visual dataset

## 🔬 How to Use

### Option 1: Full Analysis (Image + Sensor Data)
1. Upload: `sample_water_image.jpg`
2. Upload: `sample_sensor_data.csv`
3. Get comprehensive analysis from both sources

### Option 2: Image Only
1. Upload: `sample_water_image.jpg`
2. The system will analyze visual features to predict water quality

### Option 3: Sensor Only
1. Upload: `sample_sensor_data.csv`
2. Direct assessment from sensor readings

## 📊 Test Scenarios

### Scenario 1: Test Safe Water
- Files: `sample_water_image.jpg` + `sample_sensor_data.csv`
- Expected: Safe, Low Risk

### Scenario 2: Test Unsafe Water
- Files: `sample_water_image_2.jpg` + `unsafe_water_sample.csv`
- Expected: Unsafe, High Risk

### Scenario 3: Test Image-Only Analysis
- Files: `sample_water_image.jpg` only
- Expected: Analysis based on visual features

### Scenario 4: Test Sensor-Only Analysis
- Files: `unsafe_water_sample.csv` only
- Expected: Unsafe water with high risk

## 🚀 Quick Start

1. Go to the **Predict** page
2. Choose your test scenario
3. Upload the corresponding file(s)
4. Click "Predict Water Quality"
5. View results!

## 📁 File Locations

All test samples are in: `D:\FSD\test-samples\`

You can also use your own images and sensor data!


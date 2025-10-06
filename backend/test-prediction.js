/**
 * Test script to debug prediction issues
 */

const { PythonShell } = require('python-shell');
const path = require('path');

async function testPrediction() {
  console.log('Testing prediction...');
  
  const scriptPath = path.join(__dirname, 'python-scripts');
  const imagePath = path.join(__dirname, '../test-samples/sample_water_image.jpg');
  const csvPath = path.join(__dirname, '../test-samples/sample_sensor_data.csv');
  
  console.log('Script path:', scriptPath);
  console.log('Image path:', imagePath);
  console.log('CSV path:', csvPath);
  
  const options = {
    mode: 'json',
    pythonPath: 'python',
    pythonOptions: ['-u', '-W', 'ignore'],
    scriptPath: scriptPath,
    args: [imagePath, csvPath]
  };
  
  try {
    const results = await new Promise((resolve, reject) => {
      PythonShell.run('predict_hybrid.py', options, (err, results) => {
        if (err) {
          console.error('Python script error:', err);
          reject(err);
        } else {
          console.log('Python results:', results);
          resolve(results);
        }
      });
    });
    
    console.log('Success! Results:', results);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPrediction();

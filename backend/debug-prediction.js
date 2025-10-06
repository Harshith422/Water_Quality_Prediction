/**
 * Debug script to test prediction functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function debugPrediction() {
  console.log('=== DEBUGGING PREDICTION ===');
  
  // Check if files exist
  const imagePath = path.join(__dirname, '../test-samples/sample_water_image.jpg');
  const csvPath = path.join(__dirname, '../test-samples/sample_sensor_data.csv');
  
  console.log('Image path:', imagePath);
  console.log('CSV path:', csvPath);
  console.log('Image exists:', fs.existsSync(imagePath));
  console.log('CSV exists:', fs.existsSync(csvPath));
  
  const scriptPath = path.join(__dirname, 'python-scripts');
  console.log('Script path:', scriptPath);
  console.log('Script path exists:', fs.existsSync(scriptPath));
  
  const scriptFile = path.join(scriptPath, 'predict_hybrid.py');
  console.log('Script file:', scriptFile);
  console.log('Script file exists:', fs.existsSync(scriptFile));
  
  const fullScriptPath = path.join(scriptPath, 'predict_hybrid.py');
  
  console.log('\n=== RUNNING PYTHON SCRIPT ===');
  console.log('Script path:', fullScriptPath);
  console.log('Arguments:', [imagePath, csvPath]);
  
  try {
    const results = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout after 30 seconds'));
      }, 30000);
      
      const python = spawn('python', [fullScriptPath, imagePath, csvPath], {
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
          console.error('Python error - exit code:', code);
          console.error('Python stderr:', stderr);
          reject(new Error(`Python script failed with code ${code}`));
        } else {
          try {
            const jsonResult = JSON.parse(stdout.trim());
            console.log('Python results:', jsonResult);
            resolve([jsonResult]);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw output:', stdout);
            reject(parseError);
          }
        }
      });

      python.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Python process error:', error);
        reject(error);
      });
    });
    
    console.log('SUCCESS! Results:', results);
  } catch (error) {
    console.error('FAILED:', error.message);
  }
}

debugPrediction();

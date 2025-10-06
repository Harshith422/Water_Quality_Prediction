// Quick script to add sample prediction data for testing
const predictions = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    waterQuality: 'Safe',
    riskLevel: 'Low',
    confidence: { quality: 95.5, risk: 89.2 },
    sensorData: { pH: 7.2, Temperature: 24.5, TDS: 320, DO: 6.5, Turbidity: 2.1 }
  },
  {
    id: '2', 
    timestamp: new Date().toISOString(),
    waterQuality: 'Unsafe',
    riskLevel: 'High',
    confidence: { quality: 88.3, risk: 92.1 },
    sensorData: { pH: 9.5, Temperature: 32, TDS: 650, DO: 3.2, Turbidity: 8.5 }
  },
  {
    id: '3',
    timestamp: new Date().toISOString(),
    waterQuality: 'Safe', 
    riskLevel: 'Medium',
    confidence: { quality: 92.1, risk: 75.3 },
    sensorData: { pH: 7.8, Temperature: 26, TDS: 420, DO: 5.8, Turbidity: 3.2 }
  }
];

console.log('Sample data created. In production, this would be saved to DynamoDB.');
console.log('For now, the API returns empty data from memory.');
console.log('To see real data, please train the model and make predictions via the UI.');
console.log('\nSample predictions:', JSON.stringify(predictions, null, 2));


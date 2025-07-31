// Quick test for feedback API
const fetch = require('node-fetch');

async function testFeedbackAPI() {
  try {
    console.log('Testing my-feedback API endpoint...');
    
    // Test with invalid token to see if we get proper 401 instead of SQL error
    const response = await fetch('http://localhost:3000/api/feedback/my-feedback', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    const data = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (response.status === 401) {
      console.log('✅ API is working! Getting 401 for invalid token (expected)');
    } else if (response.status === 500 && data.includes('descriptionasmessage')) {
      console.log('❌ SQL error still exists');
    } else {
      console.log('🔄 Different response than expected');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFeedbackAPI(); 
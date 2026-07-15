const axios = require('axios');
const config = require('./config');

async function testGoogle() {
  const cleanKey = config.YOUTUBE_API_KEY.trim();
  
  // We use simple "+" signs here so it is bulletproof and works in any string format
  const fullUrl = 'https://googleapis.com' + cleanKey;

  try {
    console.log('Testing connection to Google...');
    const response = await axios.get(fullUrl);
    
    if (response.data.items && response.data.items.length > 0) {
      console.log('🚀 SUCCESS! VIDEO FOUND:', response.data.items[0].snippet.title);
    } else {
      console.log('🤔 Connected, but no videos found.');
    }
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      console.log('❌ GOOGLE ERR:', error.response.data.error.message);
    } else {
      console.log('❌ SYSTEM ERR:', error.message);
    }
  }
}

testGoogle();

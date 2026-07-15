const { chromium } = require('playwright');
const axios = require('axios');
const config = require('./config');

// Clear the cache manually
const YOUTUBE_API_KEY = String(config.YOUTUBE_API_KEY).trim();

async function getTopSongs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('🌐 Step 1: Playwright is fetching songs from the web...');
  
  try {
    await page.goto('https://officialcharts.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    await page.waitForSelector('.chart-name', { timeout: 15000 });

    const songElements = await page.locator('.chart-name span:nth-child(2)').allTextContents();
    const artistElements = await page.locator('.chart-artist span').allTextContents();

    const songList = [];
    for (let i = 0; i < 5; i++) { 
      if (songElements[i] && artistElements[i]) {
        songList.push(songElements[i].trim() + ' ' + artistElements[i].trim());
      }
    }
    return songList;
  } finally {
    await browser.close();
  }
}

async function searchYouTubeVideo(songName) {
  try {
    // Separation-safe query format
    const baseUrl = 'https://www.googleapis.com/youtube/v3/search';
    const query = encodeURIComponent(songName);
    const finalUrl = baseUrl + '?part=snippet&maxResults=1&type=video&q=' + query + '&key=' + YOUTUBE_API_KEY;

    const response = await axios.get(finalUrl);
    
    if (response.data.items && response.data.items.length > 0) {
      const firstResult = response.data.items[0]; // Fixed array index identifier
      const videoId = firstResult.id.videoId; 
      const videoTitle = firstResult.snippet.title;
      return { videoId, videoTitle };
    }
    return null;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      console.error('   ❌ Google API Error: ' + error.response.data.error.message);
    } else {
      console.error('   ❌ Network Error: ' + error.message);
    }
    return null;
  }
}

async function startAutomation() {
  try {
    const songs = await getTopSongs();
    console.log('\n🎵 Found ' + songs.length + ' songs. Starting YouTube API matching...\n');

    for (const song of songs) {
      console.log('🔍 Searching YouTube API for: "' + song + '"');
      const match = await searchYouTubeVideo(song);
      
      if (match) {
        console.log('   ✅ MATCH FOUND: "' + match.videoTitle + '"');
        console.log('   🔗 Link: https://www.youtube.com/watch?v=' + match.videoId + '\n');
      } else {
        console.log('   ❌ No match found on YouTube.\n');
      }
    }
    console.log('🎉 Automation complete!');
  } catch (err) {
    console.error("Fatal automated crash:", err.message);
  }
}

startAutomation();

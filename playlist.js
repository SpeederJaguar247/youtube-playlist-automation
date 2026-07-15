const { chromium } = require('playwright');
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const YOUTUBE_API_KEY = String(config.YOUTUBE_API_KEY).trim();
const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// --- 1. SCRAPER ENGINE (PLAYWRIGHT) ---
async function getTopSongs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  console.log('🌐 Step 1: Playwright is fetching top charts from the web...');
  
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

// --- 2. SEARCH ENGINE ---
// async function searchYouTubeVideo(songName) {
//   try {
//     // 🔗 This is the absolute, correct full path to Google's search engine
//     const baseUrl = 'https://googleapis.com';
//     const query = encodeURIComponent(songName);
//     const finalUrl = baseUrl + '?part=snippet&maxResults=1&type=video&q=' + query + '&key=' + YOUTUBE_API_KEY;

//     const response = await axios.get(finalUrl);
//     if (response.data.items && response.data.items.length > 0) {
//       return response.data.items[0].id.videoId;
//     }
//     return null;
//   } catch (error) {
//     return null;
//   }
// }

async function searchYouTubeVideo(songName) {
  try {
    // We use the official google tool we installed instead of typing a URL string
    const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });
    
    const response = await youtube.search.list({
      part: 'snippet',
      maxResults: 1,
      type: 'video',
      q: songName
    });

    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id.videoId;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// --- 3. OAUTH LOGIN MANAGER ---
async function getAuthenticatedClient() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // If we already logged in before, use the saved token file
  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  // If first time, generate a login URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube'],
  });

  console.log('\n🔐 ACTION REQUIRED: You need to authorize this app to access your YouTube account.');
  console.log('👉 Open this link in your browser:\n', authUrl);
  console.log('\nAfter logging in, copy the code from the page and paste it below.');

  // Open a quick prompt in the terminal to wait for your login code
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question('\nEnter the code from that page here: ', (code) => {
      readline.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oAuth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        resolve(oAuth2Client);
      });
    });
  });
}

// --- 4. MAIN PLAYLIST CREATOR AUTOMATION ---
async function runPlaylistAutomation() {
  try {
    const auth = await getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth });

    const songs = await getTopSongs();
    console.log(`\n🎵 Step 2: Found ${songs.length} chart songs. Looking up video IDs...`);

    const videoIds = [];
    for (const song of songs) {
      const id = await searchYouTubeVideo(song);
      if (id) videoIds.push(id);
    }

    console.log('\n🔨 Step 3: Creating a brand new playlist on your YouTube account...');
    const playlistResponse = await youtube.playlists.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: 'Automated Top Charts Playlist',
          description: 'Created automatically by my Playwright and Node.js script!',
        },
        status: { privacyStatus: 'private' },
      },
    });

    const playlistId = playlistResponse.data.id;
    console.log(`   ✅ Playlist Created! ID: ${playlistId}`);

    console.log('\n🚀 Step 4: Pushing items into your new playlist...');
    for (const videoId of videoIds) {
      await youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId: playlistId,
            resourceId: { kind: 'youtube#video', videoId: videoId },
          },
        },
      });
      console.log(`   ➕ Added Video ID: ${videoId} successfully.`);
    }

    console.log('\n🎉 SUCCESS! Go check your YouTube app. Your brand new playlist is ready!');
  } catch (error) {
    console.error('Fatal execution error:', error.message);
  }
}

runPlaylistAutomation();

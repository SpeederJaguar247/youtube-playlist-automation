const { chromium } = require('playwright');

async function getTopSongs() {
  // 1. Launch a browser invisibly in the background
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Fetching songs from the web...');
  
  // 2. Go to the official charts website
  await page.goto('https://officialcharts.com');

  // 3. Tell Playwright to wait for the page layout to load
  await page.waitForSelector('.chart-item', { timeout: 10000 });

  // 4. Extract song titles and artist names from the page
  const songElements = await page.locator('.chart-name span:nth-child(2)').allTextContents();
  const artistElements = await page.locator('.chart-artist span').allTextContents();

  // 5. Clean up the text and pair them together
  const songList = [];
  for (let i = 0; i < 10; i++) { // Grabbing the top 10 songs
    if (songElements[i] && artistElements[i]) {
      songList.push(`${songElements[i].trim()} by ${artistElements[i].trim()}`);
    }
  }

  await browser.close();
  return songList;
}

// Run our function and display the results
getTopSongs().then(songs => {
  console.log('\n🎵 SUCCESSFULLY FOUND THESE TOP 10 SONGS:');
  console.log(songs);
}).catch(err => {
  console.error('An error occurred:', err);
});

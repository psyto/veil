const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');

const FRONTEND_URL = 'http://localhost:3002';
const OUTPUT_PATH = path.join(__dirname, '..', 'demo-video.mp4');

const Config = {
  followNewTab: false,
  fps: 30,
  videoFrame: {
    width: 1280,
    height: 720,
  },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 3000,
  aspectRatio: '16:9',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recordDemo() {
  console.log('🎬 Starting DarkFlow Demo Recording...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--window-size=1280,720', '--no-sandbox'],
  });

  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page, Config);

  try {
    // Start recording
    await recorder.start(OUTPUT_PATH);
    console.log('📹 Recording started...\n');

    // Navigate to DarkFlow
    console.log('1️⃣ Opening DarkFlow...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Show the main interface
    console.log('2️⃣ Showing main interface...');
    await sleep(2000);

    // Hover over the privacy banner
    console.log('3️⃣ Highlighting privacy features...');
    await page.hover('.bg-purple-900\\/30');
    await sleep(2000);

    // Click on input field and type amount
    console.log('4️⃣ Entering swap amount...');
    const inputField = await page.$('input[type="number"]');
    if (inputField) {
      await inputField.click();
      await sleep(500);
      await page.keyboard.type('1.5', { delay: 150 });
      await sleep(1500);
    }

    // Change slippage
    console.log('5️⃣ Adjusting slippage...');
    const slippageButtons = await page.$$('button');
    for (const btn of slippageButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('1.0')) {
        await btn.click();
        break;
      }
    }
    await sleep(1500);

    // Click swap tokens button (arrow)
    console.log('6️⃣ Swapping token direction...');
    const swapButton = await page.$('.rounded-full.p-2');
    if (swapButton) {
      await swapButton.click();
      await sleep(1000);
      await swapButton.click();
      await sleep(1000);
    }

    // Navigate to Liquidity tab
    console.log('7️⃣ Showing Add Liquidity tab...');
    const tabs = await page.$$('button.flex-1');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Liquidity')) {
        await tab.click();
        break;
      }
    }
    await sleep(2500);

    // Enter liquidity amounts
    console.log('8️⃣ Entering liquidity amounts...');
    const lpInputs = await page.$$('input[type="number"]');
    if (lpInputs.length >= 2) {
      await lpInputs[0].click();
      await page.keyboard.type('10', { delay: 150 });
      await sleep(800);
      await lpInputs[1].click();
      await page.keyboard.type('1000', { delay: 150 });
      await sleep(1500);
    }

    // Navigate to Token Launch tab
    console.log('9️⃣ Showing Token Launch tab...');
    const allTabs = await page.$$('button.flex-1');
    for (const tab of allTabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Launch')) {
        await tab.click();
        break;
      }
    }
    await sleep(2500);

    // Back to swap tab
    console.log('🔟 Back to Dark Swap...');
    const swapTabs = await page.$$('button.flex-1');
    for (const tab of swapTabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text && text.includes('Swap')) {
        await tab.click();
        break;
      }
    }
    await sleep(2000);

    // Scroll to show stats
    console.log('📊 Showing stats...');
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    await sleep(2000);

    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await sleep(2000);

    // Stop recording
    await recorder.stop();
    console.log('\n✅ Recording completed!');
    console.log(`📁 Video saved to: ${OUTPUT_PATH}`);

  } catch (error) {
    console.error('❌ Error during recording:', error);
    await recorder.stop();
  } finally {
    await browser.close();
  }
}

recordDemo().catch(console.error);

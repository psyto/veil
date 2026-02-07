/**
 * ShadowLaunch Demo Video Recorder
 *
 * Records a comprehensive walkthrough matching the voiceover script:
 * 1. Landing page intro
 * 2. Token browser in STANDARD mode
 * 3. Toggle to SHADOW mode
 * 4. Select token and show purchase flow
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import { execSync } from 'child_process';

const OUTPUT_DIR = './demo-output';
const FRAMES_DIR = './demo-output/frames';
const VIEWPORT = { width: 1280, height: 800 };
const BASE_URL = 'http://localhost:3000';
const FPS = 30;

// Clean and create directories
[OUTPUT_DIR, FRAMES_DIR].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  fs.mkdirSync(dir, { recursive: true });
});

let frameCount = 0;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureFrame(page) {
  const framePath = `${FRAMES_DIR}/frame-${String(frameCount).padStart(5, '0')}.png`;
  await page.screenshot({ path: framePath });
  frameCount++;
}

async function captureForDuration(page, durationMs) {
  const intervalMs = 1000 / FPS;
  const frames = Math.floor(durationMs / intervalMs);
  for (let i = 0; i < frames; i++) {
    await captureFrame(page);
    await sleep(intervalMs);
  }
}

async function smoothScroll(page, targetY, durationMs = 1000) {
  const steps = Math.floor(durationMs / (1000 / FPS));
  const startY = await page.evaluate(() => window.scrollY);
  const distance = targetY - startY;

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    await page.evaluate((y) => window.scrollTo(0, y), startY + distance * eased);
    await captureFrame(page);
    await sleep(1000 / FPS);
  }
}

async function recordDemo() {
  console.log('🎬 ShadowLaunch Demo Video Recorder');
  console.log('='.repeat(50));
  console.log('Synced with voiceover script');
  console.log(`Resolution: ${VIEWPORT.width}x${VIEWPORT.height}`);
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    // ==========================================
    // [0:00 - 0:08] Scene 1: Landing Page Hero
    // VO: "ShadowLaunch. Privacy-first token purchases on Pump.fun."
    // ==========================================
    console.log('[0:00] Scene 1: Landing Page Hero');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(300);
    await captureForDuration(page, 8000);

    // ==========================================
    // [0:08 - 0:15] Scene 2: Scroll to Features
    // VO: "Every trade you make is public. Wallet trackers see everything..."
    // ==========================================
    console.log('[0:08] Scene 2: Scroll to Features');
    await smoothScroll(page, 400, 1500);
    await captureForDuration(page, 5500);

    // ==========================================
    // [0:15 - 0:20] Scene 3: Feature Cards
    // VO: "We fix that with ephemeral wallets and shielded transfers."
    // ==========================================
    console.log('[0:15] Scene 3: Feature Cards');
    await smoothScroll(page, 650, 1000);
    await captureForDuration(page, 4000);

    // ==========================================
    // [0:20 - 0:26] Scene 4: Navigate to Token Browser
    // VO: "Let me show you how it works. Click Start Trading..."
    // ==========================================
    console.log('[0:20] Scene 4: Navigate to Token Browser');
    await smoothScroll(page, 0, 800);
    await captureForDuration(page, 1000);

    // Hover and click Start Trading
    const startBtn = await page.$('a[href="/launch"]');
    if (startBtn) {
      await startBtn.hover();
      await captureForDuration(page, 800);
    }
    await page.click('a[href="/launch"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await sleep(300);
    await captureForDuration(page, 3000);

    // ==========================================
    // [0:26 - 0:32] Scene 5: Token Browser in STANDARD Mode
    // VO: "This is the token browser. Right now we're in Standard mode."
    // ==========================================
    console.log('[0:26] Scene 5: Token Browser (Standard Mode)');

    // Make sure we're in Standard mode first
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const standardBtn = buttons.find(b => b.textContent?.includes('Standard'));
      if (standardBtn) standardBtn.click();
    });
    await sleep(300);
    await captureForDuration(page, 6000);

    // ==========================================
    // [0:32 - 0:40] Scene 6: Toggle to Shadow Mode
    // VO: "Toggle to Shadow Mode. See the green glow? You're now in private mode."
    // ==========================================
    console.log('[0:32] Scene 6: Toggle to Shadow Mode');

    // Pause before clicking
    await captureForDuration(page, 1500);

    // Click Shadow mode
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const shadowBtn = buttons.find(b => b.textContent?.includes('Shadow'));
      if (shadowBtn) shadowBtn.click();
    });
    await captureForDuration(page, 6500);

    // ==========================================
    // [0:40 - 0:48] Scene 7: Browse and Select Token
    // VO: "Browse the tokens. Pick one you like. Let's select this one."
    // ==========================================
    console.log('[0:40] Scene 7: Browse and Select Token');

    // Show tokens
    await captureForDuration(page, 3000);

    // Hover over token card
    const tokenCard = await page.$('a[href^="/token/"]');
    if (tokenCard) {
      await tokenCard.hover();
      await captureForDuration(page, 2000);

      // Click token
      await tokenCard.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
      await sleep(500);
    }
    await captureForDuration(page, 2500);

    // ==========================================
    // [0:48 - 0:55] Scene 8: Token Detail Page
    // VO: "Here's the token detail page. Market cap, price, graduation progress."
    // ==========================================
    console.log('[0:48] Scene 8: Token Detail Page');
    await captureForDuration(page, 7000);

    // ==========================================
    // [0:55 - 1:05] Scene 9: Purchase Panel
    // VO: "Enter your amount. The preview shows expected tokens and fees."
    // ==========================================
    console.log('[0:55] Scene 9: Purchase Panel');

    // Focus on purchase panel area
    await captureForDuration(page, 2000);

    // Enter amount
    const amountInput = await page.$('input[type="number"]');
    if (amountInput) {
      await amountInput.click({ clickCount: 3 });
      await captureForDuration(page, 500);

      // Type slowly
      for (const char of '0.5') {
        await amountInput.type(char);
        await captureForDuration(page, 300);
      }
      await captureForDuration(page, 1500);
    }

    // Click quick amount button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent === '1');
      if (btn) btn.click();
    });
    await captureForDuration(page, 4000);

    // ==========================================
    // [1:05 - 1:15] Scene 10: Shadow Buy Button
    // VO: "Click Shadow Buy - we create a fresh wallet, transfer through privacy layer..."
    // ==========================================
    console.log('[1:05] Scene 10: Shadow Buy Button');

    // Highlight Shadow Buy button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const shadowBuyBtn = buttons.find(b => b.textContent?.includes('Shadow Buy'));
      if (shadowBuyBtn) {
        shadowBuyBtn.style.transform = 'scale(1.05)';
        shadowBuyBtn.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.6)';
        shadowBuyBtn.style.transition = 'all 0.3s ease';
      }
    });
    await captureForDuration(page, 10000);

    // ==========================================
    // [1:15 - 1:25] Scene 11: Privacy Info
    // VO: "Tokens in a wallet with zero connection to you. No tracking..."
    // ==========================================
    console.log('[1:15] Scene 11: Privacy Info');

    // Scroll slightly to show privacy message
    await smoothScroll(page, 100, 500);
    await captureForDuration(page, 9500);

    // ==========================================
    // [1:25 - 1:35] Scene 12: Final - Back to Landing
    // VO: "ShadowLaunch. Privacy-first trading on Pump.fun. Try it now."
    // ==========================================
    console.log('[1:25] Scene 12: Final');

    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await sleep(300);
    await captureForDuration(page, 10000);

    // ==========================================
    // Done capturing
    // ==========================================
    const duration = frameCount / FPS;
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Captured ${frameCount} frames`);
    console.log(`⏱️  Expected duration: ${duration.toFixed(1)} seconds`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }

  // Create video
  console.log('\n🎥 Creating video...');

  try {
    const videoPath = `${OUTPUT_DIR}/shadowlaunch-demo.mp4`;
    execSync(
      `ffmpeg -y -framerate ${FPS} -pattern_type glob -i "${FRAMES_DIR}/*.png" -c:v libx264 -pix_fmt yuv420p -crf 18 "${videoPath}"`,
      { stdio: 'pipe' }
    );

    const duration = frameCount / FPS;
    console.log(`\n✅ Video created!`);
    console.log(`📹 ${videoPath}`);
    console.log(`⏱️  Duration: ${duration.toFixed(1)} seconds`);
    console.log(`🖼️  Resolution: ${VIEWPORT.width}x${VIEWPORT.height}`);

  } catch (error) {
    console.error('❌ ffmpeg error:', error.message);
  }
}

recordDemo();

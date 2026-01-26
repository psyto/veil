/**
 * Demo Video Recorder
 *
 * Records the scripted demo using Puppeteer
 */

import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_FILE = path.join(__dirname, 'swap-router-demo.html');
const OUTPUT_VIDEO = path.join(__dirname, 'swap-router-demo.mp4');

// Timing configuration (in milliseconds)
const TIMING = {
  phaseProblem: 5000,      // Show problem for 5s
  phaseSolution: 5000,     // Show solution for 5s
  appWalletConnect: 2000,  // Wait before connecting
  appTyping: 3000,         // Time to "type" amount
  appReview: 3000,         // Review order before submit
  phaseEncrypting: 3000,   // Encryption animation
  phaseSubmitted: 4000,    // Show encrypted result
  phaseSolver: 5000,       // Solver execution logs
  phaseClosing: 5000,      // Closing message
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting demo recording...');
  console.log(`Demo file: ${DEMO_FILE}`);
  console.log(`Output: ${OUTPUT_VIDEO}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging, set to true for actual recording
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    args: [
      '--window-size=1280,720',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();

  // Initialize recorder
  const recorderConfig = {
    followNewTab: false,
    fps: 30,
    videoFrame: {
      width: 1280,
      height: 720,
    },
    videoCrf: 18,
    videoCodec: 'libx264',
    videoPreset: 'ultrafast',
    videoBitrate: 5000,
    aspectRatio: '16:9',
  };

  const recorder = new PuppeteerScreenRecorder(page, recorderConfig);

  try {
    // Load demo page
    await page.goto(`file://${DEMO_FILE}`);
    await sleep(1000);

    // Start recording
    console.log('Starting recording...');
    await recorder.start(OUTPUT_VIDEO);

    // Phase 1: Problem Statement
    console.log('Phase: Problem');
    await page.evaluate(() => (window as any).showPhase('phase-problem'));
    await sleep(TIMING.phaseProblem);

    // Phase 2: Solution Statement
    console.log('Phase: Solution');
    await page.evaluate(() => (window as any).showPhase('phase-solution'));
    await sleep(TIMING.phaseSolution);

    // Phase 3: App Demo
    console.log('Phase: App');
    await page.evaluate(() => (window as any).showPhase('phase-app'));
    await sleep(TIMING.appWalletConnect);

    // Connect wallet
    console.log('Action: Connect wallet');
    await page.evaluate(() => (window as any).connectWallet());
    await sleep(1500);

    // Type amount
    console.log('Action: Type amount');
    await page.evaluate(() => (window as any).typeAmount('1.0'));
    await sleep(TIMING.appTyping);

    // Review
    await sleep(TIMING.appReview);

    // Phase 4: Encrypting
    console.log('Phase: Encrypting');
    await page.evaluate(() => (window as any).showPhase('phase-encrypting'));
    await sleep(TIMING.phaseEncrypting);

    // Phase 5: Submitted
    console.log('Phase: Submitted');
    await page.evaluate(() => (window as any).showPhase('phase-submitted'));
    await sleep(TIMING.phaseSubmitted);

    // Phase 6: Solver
    console.log('Phase: Solver');
    await page.evaluate(() => (window as any).showPhase('phase-solver'));
    await sleep(TIMING.phaseSolver);

    // Phase 7: Closing
    console.log('Phase: Closing');
    await page.evaluate(() => (window as any).showPhase('phase-closing'));
    await sleep(TIMING.phaseClosing);

    // Stop recording
    console.log('Stopping recording...');
    await recorder.stop();

    console.log(`\n✓ Demo recorded successfully!`);
    console.log(`  Output: ${OUTPUT_VIDEO}`);

  } catch (error) {
    console.error('Error during recording:', error);
    await recorder.stop();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

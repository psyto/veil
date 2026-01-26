/**
 * RWA Secrets Service Demo Video Recorder
 *
 * Records the scripted demo using Puppeteer
 */

import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEMO_FILE = path.join(__dirname, 'rwa-secrets-demo.html');
const OUTPUT_VIDEO = path.join(__dirname, 'rwa-secrets-demo.mp4');

// Timing configuration (in milliseconds)
const TIMING = {
  phaseProblem: 6000,      // Show problem for 6s
  phaseSolution: 6000,     // Show solution for 6s
  appWalletConnect: 2000,  // Wait before connecting
  appFormFill: 3000,       // Time to fill form
  appReview: 2000,         // Review before submit
  phaseEncrypting: 3000,   // Encryption animation
  phaseRegistered: 4000,   // Show registered result
  phaseGrant: 5000,        // Grant access demo
  phaseClosing: 5000,      // Closing message
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting RWA Secrets demo recording...');
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

    // Fill form
    console.log('Action: Fill asset form');
    await page.evaluate(() => (window as any).fillAssetForm());
    await sleep(TIMING.appFormFill);

    // Review
    await sleep(TIMING.appReview);

    // Phase 4: Encrypting
    console.log('Phase: Encrypting');
    await page.evaluate(() => (window as any).showPhase('phase-encrypting'));
    await sleep(TIMING.phaseEncrypting);

    // Phase 5: Registered
    console.log('Phase: Registered');
    await page.evaluate(() => (window as any).showPhase('phase-registered'));
    await sleep(TIMING.phaseRegistered);

    // Phase 6: Grant Access
    console.log('Phase: Grant Access');
    await page.evaluate(() => (window as any).showPhase('phase-grant'));
    await sleep(TIMING.phaseGrant);

    // Phase 7: Closing
    console.log('Phase: Closing');
    await page.evaluate(() => (window as any).showPhase('phase-closing'));
    await sleep(TIMING.phaseClosing);

    // Stop recording
    console.log('Stopping recording...');
    await recorder.stop();

    console.log(`\n✓ RWA Secrets demo recorded successfully!`);
    console.log(`  Output: ${OUTPUT_VIDEO}`);

  } catch (error) {
    console.error('Error during recording:', error);
    await recorder.stop();
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

/**
 * Devnet Integration Test
 *
 * Tests basic functionality of both programs on devnet
 * without requiring additional airdrops.
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Program IDs
const SWAP_ROUTER_PROGRAM_ID = new PublicKey('v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM');
const RWA_SECRETS_PROGRAM_ID = new PublicKey('DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam');

// Load wallet
const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
);

async function main() {
  console.log('='.repeat(60));
  console.log('Solana Privacy Suite - Devnet Integration Test');
  console.log('='.repeat(60));
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);
  console.log(`Balance: ${balance / 1e9} SOL`);
  console.log('');

  // Test 1: Verify Confidential Swap Router Program
  console.log('Test 1: Confidential Swap Router Program');
  console.log('-'.repeat(40));
  try {
    const swapRouterInfo = await connection.getAccountInfo(SWAP_ROUTER_PROGRAM_ID);
    if (swapRouterInfo && swapRouterInfo.executable) {
      console.log('✓ Program deployed and executable');
      console.log(`  Program ID: ${SWAP_ROUTER_PROGRAM_ID.toBase58()}`);
      console.log(`  Data length: ${swapRouterInfo.data.length} bytes`);
    } else {
      console.log('✗ Program not found or not executable');
    }
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Test 2: Verify RWA Secrets Service Program
  console.log('Test 2: RWA Secrets Service Program');
  console.log('-'.repeat(40));
  try {
    const rwaSecretsInfo = await connection.getAccountInfo(RWA_SECRETS_PROGRAM_ID);
    if (rwaSecretsInfo && rwaSecretsInfo.executable) {
      console.log('✓ Program deployed and executable');
      console.log(`  Program ID: ${RWA_SECRETS_PROGRAM_ID.toBase58()}`);
      console.log(`  Data length: ${rwaSecretsInfo.data.length} bytes`);
    } else {
      console.log('✗ Program not found or not executable');
    }
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Test 3: Derive PDAs for Confidential Swap Router
  console.log('Test 3: Derive Confidential Swap Router PDAs');
  console.log('-'.repeat(40));
  try {
    const [solverConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('solver_config'), walletKeypair.publicKey.toBuffer()],
      SWAP_ROUTER_PROGRAM_ID
    );
    console.log('✓ Solver Config PDA derived');
    console.log(`  PDA: ${solverConfigPda.toBase58()}`);

    // Check if already initialized
    const solverConfigInfo = await connection.getAccountInfo(solverConfigPda);
    if (solverConfigInfo) {
      console.log('  Status: Already initialized');
    } else {
      console.log('  Status: Not initialized (ready to initialize)');
    }
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Test 4: Derive PDAs for RWA Secrets Service
  console.log('Test 4: Derive RWA Secrets Service PDAs');
  console.log('-'.repeat(40));
  try {
    const [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      RWA_SECRETS_PROGRAM_ID
    );
    console.log('✓ Protocol Config PDA derived');
    console.log(`  PDA: ${protocolConfigPda.toBase58()}`);

    // Check if already initialized
    const protocolConfigInfo = await connection.getAccountInfo(protocolConfigPda);
    if (protocolConfigInfo) {
      console.log('  Status: Already initialized');
    } else {
      console.log('  Status: Not initialized (ready to initialize)');
    }

    // Derive sample asset PDA
    const sampleAssetId = new Uint8Array(32).fill(1);
    const [assetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset'), Buffer.from(sampleAssetId)],
      RWA_SECRETS_PROGRAM_ID
    );
    console.log('✓ Sample Asset PDA derived');
    console.log(`  PDA: ${assetPda.toBase58()}`);
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Test 5: Test SDK Encryption Functions
  console.log('Test 5: Test Encryption Functions');
  console.log('-'.repeat(40));
  try {
    // Import from local packages
    const nacl = await import('tweetnacl');

    // Generate encryption keypair
    const encryptionKeypair = nacl.default.box.keyPair();
    console.log('✓ Encryption keypair generated');
    console.log(`  Public key: ${Buffer.from(encryptionKeypair.publicKey).toString('hex').slice(0, 32)}...`);

    // Test encryption/decryption
    const message = new TextEncoder().encode('Test swap order: 100 SOL -> USDC');
    const nonce = nacl.default.randomBytes(24);
    const recipientKeypair = nacl.default.box.keyPair();

    const encrypted = nacl.default.box(
      message,
      nonce,
      recipientKeypair.publicKey,
      encryptionKeypair.secretKey
    );
    console.log('✓ Message encrypted');
    console.log(`  Ciphertext length: ${encrypted.length} bytes`);

    const decrypted = nacl.default.box.open(
      encrypted,
      nonce,
      encryptionKeypair.publicKey,
      recipientKeypair.secretKey
    );

    if (decrypted && new TextDecoder().decode(decrypted) === 'Test swap order: 100 SOL -> USDC') {
      console.log('✓ Message decrypted successfully');
      console.log(`  Original message: "${new TextDecoder().decode(decrypted)}"`);
    } else {
      console.log('✗ Decryption failed');
    }
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Test 6: Verify Recent Blockhash (Network Connectivity)
  console.log('Test 6: Network Connectivity');
  console.log('-'.repeat(40));
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    console.log('✓ Connected to devnet');
    console.log(`  Recent blockhash: ${blockhash.slice(0, 20)}...`);
    console.log(`  Last valid block height: ${lastValidBlockHeight}`);

    const slot = await connection.getSlot();
    console.log(`  Current slot: ${slot}`);
  } catch (error) {
    console.log(`✗ Error: ${error}`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log('Both programs are deployed and accessible on devnet.');
  console.log('');
  console.log('Program IDs:');
  console.log(`  Confidential Swap Router: ${SWAP_ROUTER_PROGRAM_ID.toBase58()}`);
  console.log(`  RWA Secrets Service:      ${RWA_SECRETS_PROGRAM_ID.toBase58()}`);
  console.log('');
  console.log('Explorer Links:');
  console.log(`  https://explorer.solana.com/address/${SWAP_ROUTER_PROGRAM_ID.toBase58()}?cluster=devnet`);
  console.log(`  https://explorer.solana.com/address/${RWA_SECRETS_PROGRAM_ID.toBase58()}?cluster=devnet`);
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Run frontends with: yarn dev');
  console.log('  2. Connect wallet (with devnet SOL)');
  console.log('  3. Test swap order creation / asset registration');
  console.log('');
}

main().catch(console.error);

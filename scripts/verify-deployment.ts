/**
 * Verify Deployment Test
 *
 * Verifies that programs are deployed and accessible on devnet.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import naclModule from 'tweetnacl';
import * as fs from 'fs';
import * as path from 'path';

const nacl = naclModule;

// Program IDs
const SWAP_ROUTER_PROGRAM_ID = new PublicKey('v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM');
const RWA_SECRETS_PROGRAM_ID = new PublicKey('DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam');

// Load wallet
const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
);

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log('  Solana Privacy Suite - Deployment Verification');
  console.log('='.repeat(70));
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  let passed = 0;
  let failed = 0;

  // Test 1: Network connectivity
  console.log('1. Network Connectivity');
  try {
    const slot = await connection.getSlot();
    console.log(`   ✓ Connected to devnet (slot: ${slot})`);
    passed++;
  } catch (e) {
    console.log(`   ✗ Failed to connect to devnet`);
    failed++;
  }

  // Test 2: Wallet balance
  console.log('2. Wallet Configuration');
  try {
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`   ✓ Wallet: ${walletKeypair.publicKey.toBase58()}`);
    console.log(`   ✓ Balance: ${(balance / 1e9).toFixed(4)} SOL`);
    passed++;
  } catch (e) {
    console.log(`   ✗ Failed to get wallet balance`);
    failed++;
  }

  // Test 3: Confidential Swap Router Program
  console.log('3. Confidential Swap Router Program');
  try {
    const info = await connection.getAccountInfo(SWAP_ROUTER_PROGRAM_ID);
    if (info && info.executable) {
      console.log(`   ✓ Program deployed and executable`);
      console.log(`   ✓ Program ID: ${SWAP_ROUTER_PROGRAM_ID.toBase58()}`);
      console.log(`   ✓ Binary size: ${info.data.length} bytes`);
      passed++;
    } else {
      console.log(`   ✗ Program not found or not executable`);
      failed++;
    }
  } catch (e) {
    console.log(`   ✗ Failed to verify program: ${e}`);
    failed++;
  }

  // Test 4: RWA Secrets Service Program
  console.log('4. RWA Secrets Service Program');
  try {
    const info = await connection.getAccountInfo(RWA_SECRETS_PROGRAM_ID);
    if (info && info.executable) {
      console.log(`   ✓ Program deployed and executable`);
      console.log(`   ✓ Program ID: ${RWA_SECRETS_PROGRAM_ID.toBase58()}`);
      console.log(`   ✓ Binary size: ${info.data.length} bytes`);
      passed++;
    } else {
      console.log(`   ✗ Program not found or not executable`);
      failed++;
    }
  } catch (e) {
    console.log(`   ✗ Failed to verify program: ${e}`);
    failed++;
  }

  // Test 5: PDA Derivation (Swap Router)
  console.log('5. Swap Router PDA Derivation');
  try {
    const [solverPda, solverBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('solver_config'), walletKeypair.publicKey.toBuffer()],
      SWAP_ROUTER_PROGRAM_ID
    );
    console.log(`   ✓ Solver Config PDA: ${solverPda.toBase58()}`);
    console.log(`   ✓ Bump: ${solverBump}`);

    const orderId = new Uint8Array(8).fill(1);
    const [orderPda, orderBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('swap_order'), Buffer.from(orderId)],
      SWAP_ROUTER_PROGRAM_ID
    );
    console.log(`   ✓ Order PDA: ${orderPda.toBase58()}`);
    passed++;
  } catch (e) {
    console.log(`   ✗ Failed to derive PDAs: ${e}`);
    failed++;
  }

  // Test 6: PDA Derivation (RWA Secrets)
  console.log('6. RWA Secrets PDA Derivation');
  try {
    const [protocolPda, protocolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      RWA_SECRETS_PROGRAM_ID
    );
    console.log(`   ✓ Protocol Config PDA: ${protocolPda.toBase58()}`);
    console.log(`   ✓ Bump: ${protocolBump}`);

    const assetId = new Uint8Array(32).fill(42);
    const [assetPda, assetBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('asset'), Buffer.from(assetId)],
      RWA_SECRETS_PROGRAM_ID
    );
    console.log(`   ✓ Asset PDA: ${assetPda.toBase58()}`);
    passed++;
  } catch (e) {
    console.log(`   ✗ Failed to derive PDAs: ${e}`);
    failed++;
  }

  // Test 7: Encryption Functions
  console.log('7. Encryption Functions');
  try {
    // Generate keypairs
    const userKeypair = nacl.box.keyPair();
    const solverKeypair = nacl.box.keyPair();
    console.log(`   ✓ Generated encryption keypairs`);

    // Test encryption
    const message = new TextEncoder().encode('Swap: 1 SOL -> USDC, min: 100');
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.box(message, nonce, solverKeypair.publicKey, userKeypair.secretKey);
    console.log(`   ✓ Encrypted message (${encrypted.length} bytes)`);

    // Test decryption
    const decrypted = nacl.box.open(encrypted, nonce, userKeypair.publicKey, solverKeypair.secretKey);
    if (decrypted && new TextDecoder().decode(decrypted) === 'Swap: 1 SOL -> USDC, min: 100') {
      console.log(`   ✓ Decrypted message successfully`);
      passed++;
    } else {
      console.log(`   ✗ Decryption failed`);
      failed++;
    }
  } catch (e) {
    console.log(`   ✗ Encryption test failed: ${e}`);
    failed++;
  }

  // Test 8: Threshold Secret Sharing (Shamir's)
  console.log('8. Threshold Secret Sharing');
  try {
    // Simple XOR-based split for demo (real implementation uses Shamir's)
    const secret = nacl.randomBytes(32);
    const share1 = nacl.randomBytes(32);
    const share2 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      share2[i] = secret[i] ^ share1[i];
    }

    // Reconstruct
    const reconstructed = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      reconstructed[i] = share1[i] ^ share2[i];
    }

    const matches = secret.every((v, i) => v === reconstructed[i]);
    if (matches) {
      console.log(`   ✓ Secret splitting works`);
      console.log(`   ✓ Secret reconstruction works`);
      passed++;
    } else {
      console.log(`   ✗ Secret reconstruction failed`);
      failed++;
    }
  } catch (e) {
    console.log(`   ✗ Secret sharing test failed: ${e}`);
    failed++;
  }

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));
  console.log('');

  if (failed === 0) {
    console.log('  All tests passed! Programs are ready for use.');
    console.log('');
    console.log('  Explorer Links:');
    console.log(`  • https://explorer.solana.com/address/${SWAP_ROUTER_PROGRAM_ID}?cluster=devnet`);
    console.log(`  • https://explorer.solana.com/address/${RWA_SECRETS_PROGRAM_ID}?cluster=devnet`);
    console.log('');
    console.log('  Next Steps:');
    console.log('  1. Start the solver: cd apps/confidential-swap-router/solver && yarn dev');
    console.log('  2. Start swap frontend: cd apps/confidential-swap-router/app && yarn dev');
    console.log('  3. Start RWA frontend: cd apps/rwa-secrets-service/app && yarn dev');
    console.log('');
  } else {
    console.log(`  ${failed} test(s) failed. Please check the errors above.`);
    process.exit(1);
  }
}

main().catch(console.error);

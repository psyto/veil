/**
 * Devnet Initialization Test
 *
 * Initializes programs on devnet and tests basic operations.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import naclModule from 'tweetnacl';
const nacl = naclModule;
import BN from 'bn.js';

// Program IDs
const SWAP_ROUTER_PROGRAM_ID = new PublicKey('v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM');
const RWA_SECRETS_PROGRAM_ID = new PublicKey('DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam');

// Load wallet
const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
);

import { createHash } from 'crypto';

// Anchor discriminator helper
function getDiscriminator(name: string): Buffer {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return Buffer.from(hash.slice(0, 8));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Solana Privacy Suite - Devnet Initialization Test');
  console.log('='.repeat(60));
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);
  console.log(`Balance: ${balance / 1e9} SOL`);
  console.log('');

  // Generate encryption keypair for tests
  const encryptionKeypair = nacl.box.keyPair();
  console.log('Generated encryption keypair for testing');
  console.log(`  Public key: ${Buffer.from(encryptionKeypair.publicKey).toString('hex').slice(0, 16)}...`);
  console.log('');

  // Test 1: Initialize Solver Config (Confidential Swap Router)
  console.log('Test 1: Initialize Solver Config');
  console.log('-'.repeat(40));

  const [solverConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('solver_config'), walletKeypair.publicKey.toBuffer()],
    SWAP_ROUTER_PROGRAM_ID
  );

  // Check if already initialized
  let solverConfigInfo = await connection.getAccountInfo(solverConfigPda);
  if (solverConfigInfo) {
    console.log('✓ Solver Config already initialized');
    console.log(`  PDA: ${solverConfigPda.toBase58()}`);
  } else {
    console.log('  Initializing Solver Config...');
    try {
      // Build initialize_solver instruction
      const discriminator = getDiscriminator('initialize_solver');
      const instructionData = Buffer.concat([
        discriminator,
        Buffer.from(encryptionKeypair.publicKey), // encryption_pubkey (32 bytes)
      ]);

      const initSolverIx = new TransactionInstruction({
        programId: SWAP_ROUTER_PROGRAM_ID,
        keys: [
          { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: solverConfigPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      const tx = new Transaction().add(initSolverIx);
      const sig = await sendAndConfirmTransaction(connection, tx, [walletKeypair]);
      console.log('✓ Solver Config initialized');
      console.log(`  Transaction: ${sig}`);
      console.log(`  PDA: ${solverConfigPda.toBase58()}`);
    } catch (error: any) {
      console.log(`✗ Failed to initialize: ${error.message}`);
      if (error.logs) {
        console.log('  Logs:', error.logs.slice(-3).join('\n  '));
      }
    }
  }
  console.log('');

  // Test 2: Initialize Protocol Config (RWA Secrets Service)
  console.log('Test 2: Initialize Protocol Config');
  console.log('-'.repeat(40));

  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol_config')],
    RWA_SECRETS_PROGRAM_ID
  );

  let protocolConfigInfo = await connection.getAccountInfo(protocolConfigPda);
  if (protocolConfigInfo) {
    console.log('✓ Protocol Config already initialized');
    console.log(`  PDA: ${protocolConfigPda.toBase58()}`);
  } else {
    console.log('  Initializing Protocol Config...');
    try {
      // Build initialize_protocol instruction
      const discriminator = getDiscriminator('initialize_protocol');
      const instructionData = discriminator;

      const initProtocolIx = new TransactionInstruction({
        programId: RWA_SECRETS_PROGRAM_ID,
        keys: [
          { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: protocolConfigPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      const tx = new Transaction().add(initProtocolIx);
      const sig = await sendAndConfirmTransaction(connection, tx, [walletKeypair]);
      console.log('✓ Protocol Config initialized');
      console.log(`  Transaction: ${sig}`);
      console.log(`  PDA: ${protocolConfigPda.toBase58()}`);
    } catch (error: any) {
      console.log(`✗ Failed to initialize: ${error.message}`);
      if (error.logs) {
        console.log('  Logs:', error.logs.slice(-3).join('\n  '));
      }
    }
  }
  console.log('');

  // Test 3: Register Test Asset (RWA Secrets Service)
  console.log('Test 3: Register Test Asset');
  console.log('-'.repeat(40));

  // Generate unique asset ID
  const assetId = Keypair.generate().publicKey.toBytes();
  const [assetPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset'), Buffer.from(assetId)],
    RWA_SECRETS_PROGRAM_ID
  );

  console.log('  Registering test asset...');
  try {
    // Create test encrypted metadata
    const testMetadata = JSON.stringify({
      name: 'Test Real Estate Asset',
      value: 1000000,
      location: 'San Francisco, CA',
    });
    const nonce = nacl.randomBytes(24);
    const encryptedMetadata = nacl.secretbox(
      new TextEncoder().encode(testMetadata),
      nonce,
      encryptionKeypair.secretKey.slice(0, 32)
    );

    // Full encrypted payload: nonce + ciphertext
    const fullEncrypted = Buffer.concat([Buffer.from(nonce), Buffer.from(encryptedMetadata)]);

    // Build register_asset instruction
    const discriminator = getDiscriminator('register_asset');

    // Serialize instruction data
    // asset_id: [u8; 32]
    // asset_type: u8 (0 = RealEstate)
    // encrypted_metadata: Vec<u8> (length prefix + data)
    // encryption_pubkey: [u8; 32]
    const metadataLenBuffer = Buffer.alloc(4);
    metadataLenBuffer.writeUInt32LE(fullEncrypted.length, 0);

    const instructionData = Buffer.concat([
      discriminator,
      Buffer.from(assetId),
      Buffer.from([0]), // AssetType::RealEstate
      metadataLenBuffer,
      fullEncrypted,
      Buffer.from(encryptionKeypair.publicKey),
    ]);

    const registerAssetIx = new TransactionInstruction({
      programId: RWA_SECRETS_PROGRAM_ID,
      keys: [
        { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: protocolConfigPda, isSigner: false, isWritable: true },
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    const tx = new Transaction().add(registerAssetIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [walletKeypair]);
    console.log('✓ Test asset registered');
    console.log(`  Transaction: ${sig}`);
    console.log(`  Asset PDA: ${assetPda.toBase58()}`);
  } catch (error: any) {
    console.log(`✗ Failed to register asset: ${error.message}`);
    if (error.logs) {
      console.log('  Logs:', error.logs.slice(-5).join('\n  '));
    }
  }
  console.log('');

  // Final balance check
  const finalBalance = await connection.getBalance(walletKeypair.publicKey);
  console.log('='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
  console.log(`Initial Balance: ${balance / 1e9} SOL`);
  console.log(`Final Balance:   ${finalBalance / 1e9} SOL`);
  console.log(`SOL Used:        ${(balance - finalBalance) / 1e9} SOL`);
  console.log('');
}

main().catch(console.error);

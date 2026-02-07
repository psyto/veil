import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export const SOVEREIGN_PROGRAM_ID = new PublicKey('2UAZc1jj4QTSkgrC8U9d4a7EM9AQunxMvW5g7rX7Af9T');

export interface SovereignIdentity {
  owner: PublicKey;
  tradingScore: number;
  civicScore: number;
  developerScore: number;
  infraScore: number;
  compositeScore: number;
  tier: number;
}

export function getIdentityPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), owner.toBuffer()],
    SOVEREIGN_PROGRAM_ID
  );
}

export function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Bronze';
    case 2: return 'Silver';
    case 3: return 'Gold';
    case 4: return 'Platinum';
    case 5: return 'Diamond';
    default: return 'None';
  }
}

export function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#CD7F32'; // Bronze
    case 2: return '#C0C0C0'; // Silver
    case 3: return '#FFD700'; // Gold
    case 4: return '#E5E4E2'; // Platinum
    case 5: return '#B9F2FF'; // Diamond
    default: return '#666666';
  }
}

// Umbra-specific tier benefits
export function getFeeBps(tier: number): number {
  switch (tier) {
    case 1: return 30;  // 0.30% - Bronze
    case 2: return 15;  // 0.15% - Silver
    case 3: return 8;   // 0.08% - Gold
    case 4: return 5;   // 0.05% - Platinum
    case 5: return 3;   // 0.03% - Diamond
    default: return 50; // 0.50% - No tier
  }
}

export function getMevProtection(tier: number): string {
  switch (tier) {
    case 1: return 'Basic';
    case 2: return 'Full';
    case 3: return 'Priority';
    case 4: return 'Priority';
    case 5: return 'Priority';
    default: return 'None';
  }
}

export function getOrderTypes(tier: number): string[] {
  switch (tier) {
    case 1: return ['Market', 'Limit'];
    case 2: return ['Market', 'Limit', 'TWAP'];
    case 3: return ['Market', 'Limit', 'TWAP', 'Iceberg'];
    case 4: return ['Market', 'Limit', 'TWAP', 'Iceberg', 'Dark'];
    case 5: return ['Market', 'Limit', 'TWAP', 'Iceberg', 'Dark', 'RFQ'];
    default: return ['Market'];
  }
}

export function getMaxOrderSize(tier: number): number {
  switch (tier) {
    case 1: return 1000;       // $1,000
    case 2: return 10000;      // $10,000
    case 3: return 100000;     // $100,000
    case 4: return 1000000;    // $1,000,000
    case 5: return Infinity;   // Unlimited
    default: return 500;       // $500
  }
}

export async function fetchSovereignIdentity(
  connection: Connection,
  owner: PublicKey
): Promise<SovereignIdentity | null> {
  const [identityPda] = getIdentityPda(owner);

  const accountInfo = await connection.getAccountInfo(identityPda);
  if (!accountInfo) {
    return null;
  }

  const data = accountInfo.data;

  // Parse the account data
  // Skip 8-byte discriminator
  const ownerPubkey = new PublicKey(data.slice(8, 40));

  // Skip created_at (8 bytes) and authorities (4 * 32 bytes)
  // Scores start at offset 176
  const tradingScore = data.readUInt16LE(176);
  const civicScore = data.readUInt16LE(178);
  const developerScore = data.readUInt16LE(180);
  const infraScore = data.readUInt16LE(182);
  const compositeScore = data.readUInt16LE(184);
  const tier = data.readUInt8(186);

  return {
    owner: ownerPubkey,
    tradingScore,
    civicScore,
    developerScore,
    infraScore,
    compositeScore,
    tier,
  };
}

// Anchor instruction discriminator for create_identity
// sha256("global:create_identity")[0..8]
const CREATE_IDENTITY_DISCRIMINATOR = Buffer.from([12, 253, 209, 41, 176, 51, 195, 179]);

export async function createSovereignIdentity(
  connection: Connection,
  wallet: WalletContextState
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  const [identityPda] = getIdentityPda(wallet.publicKey);

  // Check if identity already exists
  const existingAccount = await connection.getAccountInfo(identityPda);
  if (existingAccount) {
    throw new Error('SOVEREIGN identity already exists for this wallet');
  }

  // Build the create_identity instruction
  const createIdentityIx = new TransactionInstruction({
    programId: SOVEREIGN_PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: identityPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: CREATE_IDENTITY_DISCRIMINATOR,
  });

  // Create and send transaction
  const transaction = new Transaction().add(createIdentityIx);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  const signedTx = await wallet.signTransaction(transaction);
  const txId = await connection.sendRawTransaction(signedTx.serialize());

  // Wait for confirmation
  await connection.confirmTransaction({
    signature: txId,
    blockhash,
    lastValidBlockHeight,
  });

  return txId;
}

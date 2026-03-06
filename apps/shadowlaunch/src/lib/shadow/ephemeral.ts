/**
 * Ephemeral Wallet Management
 *
 * Generates temporary keypairs for private transactions.
 * These wallets have no seed phrase and no recovery - true privacy by design.
 */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/**
 * Ephemeral wallet - exists only in memory
 */
export interface EphemeralWallet {
  /** The keypair (public + secret key) */
  keypair: Keypair;
  /** Public key for receiving funds */
  publicKey: PublicKey;
  /** When this wallet was created */
  createdAt: number;
  /** Optional label for tracking */
  label?: string;
}

/**
 * Create a new ephemeral wallet
 *
 * WARNING: This wallet has no seed phrase and cannot be recovered.
 * If you close the browser, the funds are lost forever.
 */
export function createEphemeralWallet(label?: string): EphemeralWallet {
  const keypair = Keypair.generate();

  return {
    keypair,
    publicKey: keypair.publicKey,
    createdAt: Date.now(),
    label,
  };
}

/**
 * Get SOL balance of an ephemeral wallet
 */
export async function getEphemeralBalance(
  connection: Connection,
  wallet: EphemeralWallet
): Promise<number> {
  const balance = await connection.getBalance(wallet.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Get SOL balance in lamports
 */
export async function getEphemeralBalanceLamports(
  connection: Connection,
  wallet: EphemeralWallet
): Promise<bigint> {
  const balance = await connection.getBalance(wallet.publicKey);
  return BigInt(balance);
}

/**
 * Fund an ephemeral wallet from another wallet
 *
 * Note: This creates an on-chain link. For true privacy,
 * use shieldAndFund() which routes through the privacy pool.
 */
export async function fundEphemeralDirect(
  connection: Connection,
  fromKeypair: Keypair,
  toEphemeral: EphemeralWallet,
  amountSol: number
): Promise<string> {
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toEphemeral.publicKey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    fromKeypair,
  ]);

  return signature;
}

/**
 * Drain all SOL from ephemeral wallet to destination
 */
export async function drainEphemeral(
  connection: Connection,
  ephemeral: EphemeralWallet,
  destinationPubkey: PublicKey
): Promise<string> {
  const balance = await connection.getBalance(ephemeral.publicKey);

  // Need to leave enough for transaction fee
  const fee = 5000; // ~0.000005 SOL
  const transferAmount = balance - fee;

  if (transferAmount <= 0) {
    throw new Error("Insufficient balance to drain (need fee)");
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: ephemeral.publicKey,
      toPubkey: destinationPubkey,
      lamports: transferAmount,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    ephemeral.keypair,
  ]);

  return signature;
}

/**
 * Check if ephemeral wallet has sufficient balance
 */
export async function hasMinimumBalance(
  connection: Connection,
  wallet: EphemeralWallet,
  minimumSol: number
): Promise<boolean> {
  const balance = await getEphemeralBalance(connection, wallet);
  return balance >= minimumSol;
}

/**
 * Ephemeral wallet manager - tracks multiple ephemeral wallets in memory
 */
export class EphemeralWalletManager {
  private wallets: Map<string, EphemeralWallet> = new Map();

  /**
   * Create and track a new ephemeral wallet
   */
  create(label?: string): EphemeralWallet {
    const wallet = createEphemeralWallet(label);
    this.wallets.set(wallet.publicKey.toBase58(), wallet);
    return wallet;
  }

  /**
   * Get wallet by public key
   */
  get(publicKey: string): EphemeralWallet | undefined {
    return this.wallets.get(publicKey);
  }

  /**
   * List all tracked wallets
   */
  list(): EphemeralWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Remove wallet from tracking (does not drain funds!)
   */
  remove(publicKey: string): boolean {
    return this.wallets.delete(publicKey);
  }

  /**
   * Clear all tracked wallets (does not drain funds!)
   */
  clear(): void {
    this.wallets.clear();
  }

  /**
   * Get total count of tracked wallets
   */
  count(): number {
    return this.wallets.size;
  }
}

// Singleton instance for app-wide ephemeral wallet tracking
export const ephemeralManager = new EphemeralWalletManager();

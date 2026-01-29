/**
 * Shadow Purchase Flow
 *
 * Executes token purchases through privacy layer:
 * 1. Shield SOL from main wallet to privacy pool
 * 2. Unshield to ephemeral address
 * 3. Purchase token with ephemeral
 * 4. Result: No on-chain link between main wallet and tokens
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createEphemeralWallet, EphemeralWallet } from "./ephemeral";
import { shieldTokens, unshieldTokens } from "@privacy-suite/crypto";
import { purchaseToken } from "../pumpfun/client";

export type ShadowMode = "standard" | "shadow";

export interface ShadowPurchaseParams {
  /** Token mint address to purchase */
  tokenMint: PublicKey;
  /** Amount in SOL to spend */
  amountSol: number;
  /** Main wallet keypair (for shielding) */
  mainWallet: Keypair;
  /** Solana connection */
  connection: Connection;
  /** Slippage tolerance in basis points (default 500 = 5%) */
  slippageBps?: number;
}

export interface ShadowPurchaseResult {
  /** Whether the purchase succeeded */
  success: boolean;
  /** The ephemeral wallet holding the tokens */
  ephemeralWallet: EphemeralWallet;
  /** Amount of tokens received */
  tokenAmount: bigint;
  /** Purchase transaction signature */
  purchaseSignature: string;
  /** Shield transaction signature */
  shieldSignature?: string;
  /** Unshield transaction signature */
  unshieldSignature?: string;
  /** Error message if failed */
  error?: string;
}

export interface StandardPurchaseParams {
  /** Token mint address to purchase */
  tokenMint: PublicKey;
  /** Amount in SOL to spend */
  amountSol: number;
  /** Wallet keypair */
  wallet: Keypair;
  /** Solana connection */
  connection: Connection;
  /** Slippage tolerance in basis points (default 500 = 5%) */
  slippageBps?: number;
}

export interface StandardPurchaseResult {
  success: boolean;
  tokenAmount: bigint;
  signature: string;
  error?: string;
}

/**
 * Execute a shadow (private) purchase
 *
 * This breaks the on-chain link between your main wallet and the tokens:
 * - Main wallet shields SOL to privacy pool
 * - SOL is unshielded to a fresh ephemeral address
 * - Token is purchased from ephemeral address
 * - Tokens end up in ephemeral wallet with no link to main wallet
 */
export async function executeShadowPurchase(
  params: ShadowPurchaseParams
): Promise<ShadowPurchaseResult> {
  const {
    tokenMint,
    amountSol,
    mainWallet,
    connection,
    slippageBps = 500,
  } = params;

  // Create ephemeral wallet for this purchase
  const ephemeral = createEphemeralWallet(`purchase-${tokenMint.toBase58().slice(0, 8)}`);

  try {
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    // Step 1: Shield SOL from main wallet to privacy pool
    console.log("[Shadow] Shielding SOL to privacy pool...");
    const shieldResult = await shieldTokens(
      connection,
      mainWallet,
      amountLamports,
      "SOL"
    );

    // Step 2: Unshield to ephemeral wallet
    console.log("[Shadow] Unshielding to ephemeral address...");
    const unshieldResult = await unshieldTokens(
      connection,
      mainWallet,
      amountLamports,
      ephemeral.publicKey,
      "SOL"
    );

    // Step 3: Purchase token with ephemeral wallet
    console.log("[Shadow] Purchasing token with ephemeral wallet...");
    const purchaseResult = await purchaseToken(
      connection,
      ephemeral.keypair,
      tokenMint,
      amountLamports,
      slippageBps
    );

    return {
      success: true,
      ephemeralWallet: ephemeral,
      tokenAmount: purchaseResult.tokenAmount,
      purchaseSignature: purchaseResult.signature,
      shieldSignature: shieldResult.signature,
      unshieldSignature: unshieldResult.signature,
    };
  } catch (error) {
    console.error("[Shadow] Purchase failed:", error);
    return {
      success: false,
      ephemeralWallet: ephemeral,
      tokenAmount: BigInt(0),
      purchaseSignature: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a standard (non-private) purchase
 *
 * Direct purchase from your wallet - creates on-chain link.
 */
export async function executeStandardPurchase(
  params: StandardPurchaseParams
): Promise<StandardPurchaseResult> {
  const {
    tokenMint,
    amountSol,
    wallet,
    connection,
    slippageBps = 500,
  } = params;

  try {
    const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

    const result = await purchaseToken(
      connection,
      wallet,
      tokenMint,
      amountLamports,
      slippageBps
    );

    return {
      success: true,
      tokenAmount: result.tokenAmount,
      signature: result.signature,
    };
  } catch (error) {
    return {
      success: false,
      tokenAmount: BigInt(0),
      signature: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Estimate gas costs for shadow vs standard purchase
 */
export function estimatePurchaseCosts(amountSol: number): {
  standard: { totalSol: number; fees: number };
  shadow: { totalSol: number; fees: number };
} {
  // Standard: just purchase fee
  const standardFee = 0.000005; // ~5000 lamports

  // Shadow: shield + unshield + purchase fees
  const shieldFee = 0.001; // ~1M lamports
  const unshieldFee = 0.002; // ~2M lamports (includes relayer)
  const purchaseFee = 0.000005;
  const shadowTotalFees = shieldFee + unshieldFee + purchaseFee;

  return {
    standard: {
      totalSol: amountSol + standardFee,
      fees: standardFee,
    },
    shadow: {
      totalSol: amountSol + shadowTotalFees,
      fees: shadowTotalFees,
    },
  };
}

/**
 * Pump.fun API Client
 *
 * Handles fetching token data and executing purchases on Pump.fun
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  PumpFunToken,
  PumpFunTrade,
  TokenFilterOptions,
  TokenSortOption,
} from "./types";
import { calculatePurchaseAmount, calculateMinTokensOut } from "./bonding-curve";

const PUMPFUN_API_URL =
  process.env.NEXT_PUBLIC_PUMPFUN_API_URL || "https://frontend-api.pump.fun";

// Pump.fun program IDs (mainnet)
const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);

/**
 * Fetch trending tokens from Pump.fun
 */
export async function getTrendingTokens(
  options: TokenFilterOptions = {}
): Promise<PumpFunToken[]> {
  const {
    sort = "market_cap",
    order = "DESC",
    limit = 50,
    offset = 0,
    includeNsfw = false,
  } = options;

  const params = new URLSearchParams({
    sort,
    order,
    limit: limit.toString(),
    offset: offset.toString(),
    includeNsfw: includeNsfw.toString(),
  });

  const response = await fetch(`${PUMPFUN_API_URL}/coins?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tokens: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch newly created tokens
 */
export async function getNewTokens(limit: number = 50): Promise<PumpFunToken[]> {
  return getTrendingTokens({
    sort: "created_timestamp",
    order: "DESC",
    limit,
  });
}

/**
 * Fetch a single token by mint address
 */
export async function getToken(mint: string): Promise<PumpFunToken> {
  const response = await fetch(`${PUMPFUN_API_URL}/coins/${mint}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search tokens by name or symbol
 */
export async function searchTokens(query: string): Promise<PumpFunToken[]> {
  const response = await fetch(
    `${PUMPFUN_API_URL}/coins/search?query=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to search tokens: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch recent trades for a token
 */
export async function getTokenTrades(
  mint: string,
  limit: number = 50
): Promise<PumpFunTrade[]> {
  const response = await fetch(
    `${PUMPFUN_API_URL}/trades/latest?mint=${mint}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch trades: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch tokens created by a specific wallet
 */
export async function getTokensByCreator(
  creator: string
): Promise<PumpFunToken[]> {
  const response = await fetch(`${PUMPFUN_API_URL}/coins/user/${creator}/created`);

  if (!response.ok) {
    throw new Error(`Failed to fetch creator tokens: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Purchase result from executing a buy
 */
export interface PurchaseResult {
  signature: string;
  tokenAmount: bigint;
  solSpent: bigint;
}

/**
 * Purchase tokens from Pump.fun bonding curve
 *
 * Note: This is a simplified implementation. In production,
 * you would use the actual Pump.fun SDK or construct the
 * proper instruction from the program IDL.
 */
export async function purchaseToken(
  connection: Connection,
  buyer: Keypair,
  tokenMint: PublicKey,
  amountLamports: bigint,
  slippageBps: number = 500
): Promise<PurchaseResult> {
  // Fetch current token state
  const token = await getToken(tokenMint.toBase58());

  // Calculate expected tokens
  const amountSol = Number(amountLamports) / LAMPORTS_PER_SOL;
  const calculation = calculatePurchaseAmount(token, amountSol);

  // Apply slippage
  const minTokensOut = calculateMinTokensOut(calculation.tokenAmount, slippageBps);

  console.log(
    `[Pump.fun] Buying ~${calculation.tokenAmount} tokens for ${amountSol} SOL`
  );
  console.log(`[Pump.fun] Price impact: ${calculation.priceImpact.toFixed(2)}%`);
  console.log(`[Pump.fun] Min tokens out (with slippage): ${minTokensOut}`);

  // Build the purchase instruction
  // Note: This is a placeholder. Real implementation would use
  // the Pump.fun program's buy instruction from their SDK
  const instruction = await buildPurchaseInstruction(
    buyer.publicKey,
    tokenMint,
    amountLamports,
    minTokensOut
  );

  // Create and send transaction
  const transaction = new Transaction().add(instruction);

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    buyer,
  ]);

  return {
    signature,
    tokenAmount: calculation.tokenAmount,
    solSpent: amountLamports,
  };
}

/**
 * Build the Pump.fun purchase instruction
 *
 * Note: This is a placeholder implementation.
 * Real implementation would construct the proper instruction
 * based on Pump.fun's program IDL.
 */
async function buildPurchaseInstruction(
  buyer: PublicKey,
  tokenMint: PublicKey,
  amountLamports: bigint,
  minTokensOut: bigint
): Promise<TransactionInstruction> {
  // Placeholder - in production, this would:
  // 1. Derive the bonding curve PDA
  // 2. Derive the associated token accounts
  // 3. Construct the buy instruction with proper data

  // For now, return a dummy instruction that would fail
  // Replace this with actual Pump.fun SDK integration
  return new TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
    ],
    programId: PUMP_PROGRAM_ID,
    data: Buffer.from([
      // Instruction discriminator for "buy" would go here
      // Amount data would follow
    ]),
  });
}

/**
 * Get token holder count (approximate from recent trades)
 */
export async function getApproximateHolderCount(mint: string): Promise<number> {
  const trades = await getTokenTrades(mint, 1000);
  const uniqueBuyers = new Set(
    trades.filter((t) => t.is_buy).map((t) => t.user)
  );
  return uniqueBuyers.size;
}

/**
 * Check if a token is likely a honeypot (can't sell)
 * Basic heuristic: if there are buys but no sells in recent trades
 */
export async function checkHoneypotRisk(mint: string): Promise<{
  isRisky: boolean;
  buyCount: number;
  sellCount: number;
  reason?: string;
}> {
  const trades = await getTokenTrades(mint, 100);

  const buyCount = trades.filter((t) => t.is_buy).length;
  const sellCount = trades.filter((t) => !t.is_buy).length;

  // If there are many buys but zero sells, it might be a honeypot
  if (buyCount > 10 && sellCount === 0) {
    return {
      isRisky: true,
      buyCount,
      sellCount,
      reason: "No sells detected - possible honeypot",
    };
  }

  return {
    isRisky: false,
    buyCount,
    sellCount,
  };
}

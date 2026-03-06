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
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  PumpFunToken,
  PumpFunTrade,
  TokenFilterOptions,
} from "./types";
import { calculatePurchaseAmount, calculateMinTokensOut } from "./bonding-curve";
import {
  getMockTrendingTokens,
  getMockNewTokens,
  searchMockTokens,
  getMockToken,
} from "./mock-data";

const PUMPFUN_API_URL =
  process.env.NEXT_PUBLIC_PUMPFUN_API_URL || "https://frontend-api.pump.fun";

// Pump.fun program addresses (mainnet)
export const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);
export const PUMP_GLOBAL_STATE = new PublicKey(
  "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
);
export const PUMP_FEE_RECIPIENT = new PublicKey(
  "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
);
export const PUMP_EVENT_AUTHORITY = new PublicKey(
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"
);

// Instruction discriminators (Anchor-style)
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

/**
 * Derive the bonding curve PDA for a token
 */
export function deriveBondingCurvePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
}

/**
 * Derive the associated bonding curve token account
 */
export async function deriveAssociatedBondingCurve(
  mint: PublicKey,
  bondingCurve: PublicKey
): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, bondingCurve, true);
}

/**
 * Fetch trending tokens from Pump.fun
 * Falls back to mock data if API is unavailable
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

  try {
    const response = await fetch(`${PUMPFUN_API_URL}/coins?${params}`, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if response is valid array
    if (!Array.isArray(data)) {
      throw new Error("Invalid API response");
    }

    return data;
  } catch (error) {
    console.warn("[Pump.fun] API unavailable, using mock data:", error);
    // Return mock data as fallback
    return getMockTrendingTokens(limit);
  }
}

/**
 * Fetch newly created tokens
 * Falls back to mock data if API is unavailable
 */
export async function getNewTokens(limit: number = 50): Promise<PumpFunToken[]> {
  try {
    return await getTrendingTokens({
      sort: "created_timestamp",
      order: "DESC",
      limit,
    });
  } catch (error) {
    console.warn("[Pump.fun] API unavailable for new tokens, using mock data");
    return getMockNewTokens(limit);
  }
}

/**
 * Fetch a single token by mint address
 * Falls back to mock data if API is unavailable
 */
export async function getToken(mint: string): Promise<PumpFunToken> {
  try {
    const response = await fetch(`${PUMPFUN_API_URL}/coins/${mint}`, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10 seconds
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response has required fields
    if (!data.mint || !data.virtual_sol_reserves) {
      throw new Error("Invalid token data");
    }

    return data;
  } catch (error) {
    console.warn("[Pump.fun] API unavailable for token, using mock data:", error);
    // Try to find in mock data
    const mockToken = getMockToken(mint);
    if (mockToken) {
      return mockToken;
    }
    // Return first mock token as fallback for demo
    return getMockTrendingTokens(1)[0];
  }
}

/**
 * Search tokens by name or symbol
 * Falls back to mock data if API is unavailable
 */
export async function searchTokens(query: string): Promise<PumpFunToken[]> {
  try {
    const response = await fetch(
      `${PUMPFUN_API_URL}/coins/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search tokens: ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid search response");
    }

    return data;
  } catch (error) {
    console.warn("[Pump.fun] API unavailable for search, using mock data:", error);
    return searchMockTokens(query);
  }
}

/**
 * Fetch recent trades for a token
 */
export async function getTokenTrades(
  mint: string,
  limit: number = 50
): Promise<PumpFunTrade[]> {
  try {
    const response = await fetch(
      `${PUMPFUN_API_URL}/trades/latest?mint=${mint}&limit=${limit}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch trades: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("[Pump.fun] Error fetching trades:", error);
    throw error;
  }
}

/**
 * Fetch tokens created by a specific wallet
 */
export async function getTokensByCreator(
  creator: string
): Promise<PumpFunToken[]> {
  try {
    const response = await fetch(`${PUMPFUN_API_URL}/coins/user/${creator}/created`, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch creator tokens: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("[Pump.fun] Error fetching creator tokens:", error);
    throw error;
  }
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

  if (token.complete) {
    throw new Error("Token has graduated to Raydium. Use Raydium to trade.");
  }

  // Calculate expected tokens
  const amountSol = Number(amountLamports) / LAMPORTS_PER_SOL;
  const calculation = calculatePurchaseAmount(token, amountSol);

  // Apply slippage
  const minTokensOut = calculateMinTokensOut(calculation.tokenAmount, slippageBps);

  console.log(`[Pump.fun] Buying ~${calculation.tokenAmount} tokens for ${amountSol} SOL`);
  console.log(`[Pump.fun] Price impact: ${calculation.priceImpact.toFixed(2)}%`);
  console.log(`[Pump.fun] Min tokens out (${slippageBps/100}% slippage): ${minTokensOut}`);

  // Derive PDAs
  const [bondingCurve] = deriveBondingCurvePDA(tokenMint);
  const associatedBondingCurve = await deriveAssociatedBondingCurve(tokenMint, bondingCurve);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, buyer.publicKey);

  // Build transaction
  const transaction = new Transaction();

  // Add compute budget for complex transaction
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
  );

  // Check if user has token account, if not create it
  try {
    await getAccount(connection, userTokenAccount);
  } catch {
    // Account doesn't exist, create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer.publicKey,
        userTokenAccount,
        buyer.publicKey,
        tokenMint
      )
    );
  }

  // Build the buy instruction
  const buyInstruction = buildBuyInstruction(
    buyer.publicKey,
    tokenMint,
    bondingCurve,
    associatedBondingCurve,
    userTokenAccount,
    amountLamports,
    minTokensOut
  );

  transaction.add(buyInstruction);

  // Send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [buyer],
    {
      commitment: "confirmed",
      maxRetries: 3,
    }
  );

  console.log(`[Pump.fun] Purchase successful: ${signature}`);

  return {
    signature,
    tokenAmount: calculation.tokenAmount,
    solSpent: amountLamports,
  };
}

/**
 * Build the Pump.fun buy instruction
 */
function buildBuyInstruction(
  buyer: PublicKey,
  tokenMint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  userTokenAccount: PublicKey,
  maxSolCost: bigint,
  minTokensOut: bigint
): TransactionInstruction {
  // Instruction data layout:
  // [8 bytes] discriminator
  // [8 bytes] amount (tokens to buy)
  // [8 bytes] max_sol_cost
  const data = Buffer.alloc(24);
  BUY_DISCRIMINATOR.copy(data, 0);

  // Write min tokens out as u64
  writeBigUInt64LE(data, minTokensOut, 8);

  // Write max SOL cost as u64
  writeBigUInt64LE(data, maxSolCost, 16);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL_STATE, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Sell tokens back to Pump.fun bonding curve
 */
export async function sellToken(
  connection: Connection,
  seller: Keypair,
  tokenMint: PublicKey,
  tokenAmount: bigint,
  slippageBps: number = 500
): Promise<{ signature: string; solReceived: bigint }> {
  // Fetch current token state
  const token = await getToken(tokenMint.toBase58());

  if (token.complete) {
    throw new Error("Token has graduated to Raydium. Use Raydium to trade.");
  }

  // Derive PDAs
  const [bondingCurve] = deriveBondingCurvePDA(tokenMint);
  const associatedBondingCurve = await deriveAssociatedBondingCurve(tokenMint, bondingCurve);
  const userTokenAccount = await getAssociatedTokenAddress(tokenMint, seller.publicKey);

  // Calculate expected SOL
  const { virtual_sol_reserves: x, virtual_token_reserves: y } = token;
  const k = x * y;
  const newY = y + Number(tokenAmount);
  const newX = k / newY;
  const expectedSol = BigInt(Math.floor((x - newX) * LAMPORTS_PER_SOL));

  // Apply slippage for min SOL out
  const minSolOut = (expectedSol * BigInt(10000 - slippageBps)) / BigInt(10000);

  console.log(`[Pump.fun] Selling ${tokenAmount} tokens for ~${Number(expectedSol) / LAMPORTS_PER_SOL} SOL`);

  // Build the sell instruction
  const sellInstruction = buildSellInstruction(
    seller.publicKey,
    tokenMint,
    bondingCurve,
    associatedBondingCurve,
    userTokenAccount,
    tokenAmount,
    minSolOut
  );

  // Build transaction
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
  );

  transaction.add(sellInstruction);

  // Send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [seller],
    {
      commitment: "confirmed",
      maxRetries: 3,
    }
  );

  console.log(`[Pump.fun] Sale successful: ${signature}`);

  return {
    signature,
    solReceived: expectedSol,
  };
}

/**
 * Build the Pump.fun sell instruction
 */
function buildSellInstruction(
  seller: PublicKey,
  tokenMint: PublicKey,
  bondingCurve: PublicKey,
  associatedBondingCurve: PublicKey,
  userTokenAccount: PublicKey,
  tokenAmount: bigint,
  minSolOut: bigint
): TransactionInstruction {
  // Instruction data layout:
  // [8 bytes] discriminator
  // [8 bytes] amount (tokens to sell)
  // [8 bytes] min_sol_output
  const data = Buffer.alloc(24);
  SELL_DISCRIMINATOR.copy(data, 0);

  // Write token amount as u64
  writeBigUInt64LE(data, tokenAmount, 8);

  // Write min SOL out as u64
  writeBigUInt64LE(data, minSolOut, 16);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL_STATE, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Write a BigInt as little-endian u64 to a buffer
 */
function writeBigUInt64LE(buffer: Buffer, value: bigint, offset: number): void {
  const low = Number(value & BigInt(0xFFFFFFFF));
  const high = Number((value >> BigInt(32)) & BigInt(0xFFFFFFFF));
  buffer.writeUInt32LE(low, offset);
  buffer.writeUInt32LE(high, offset + 4);
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

/**
 * Get the current price of a token in SOL
 */
export async function getTokenPrice(mint: string): Promise<number> {
  const token = await getToken(mint);
  return token.virtual_sol_reserves / token.virtual_token_reserves;
}

/**
 * Simulate a purchase without executing
 */
export async function simulatePurchase(
  tokenMint: string,
  amountSol: number
): Promise<{
  tokensOut: bigint;
  priceImpact: number;
  newPrice: number;
  averagePrice: number;
}> {
  const token = await getToken(tokenMint);
  const calculation = calculatePurchaseAmount(token, amountSol);

  return {
    tokensOut: calculation.tokenAmount,
    priceImpact: calculation.priceImpact,
    newPrice: calculation.newPrice,
    averagePrice: calculation.averagePrice,
  };
}

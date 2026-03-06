/**
 * Pump.fun Bonding Curve Calculations
 *
 * Pump.fun uses a constant product AMM (x * y = k) for its bonding curve.
 * This module provides calculations for price, amounts, and impact.
 */

import { PumpFunToken, BondingCurveState, PurchaseCalculation } from "./types";

// Pump.fun constants
const TOTAL_TOKEN_SUPPLY = 1_000_000_000; // 1 billion tokens
const GRADUATION_THRESHOLD_SOL = 85; // ~$12,000 USD to graduate
const INITIAL_VIRTUAL_SOL = 30; // Initial virtual SOL reserves
const INITIAL_VIRTUAL_TOKENS = 1_073_000_000; // Initial virtual token reserves

/**
 * Get the bonding curve state from token data
 */
export function getBondingCurveState(token: PumpFunToken): BondingCurveState {
  const virtualSolReserves = token.virtual_sol_reserves;
  const virtualTokenReserves = token.virtual_token_reserves;
  const k = virtualSolReserves * virtualTokenReserves;

  // Current price = SOL / Tokens
  const currentPrice = virtualSolReserves / virtualTokenReserves;

  // Market cap = price * circulating supply
  const circulatingSupply = TOTAL_TOKEN_SUPPLY - virtualTokenReserves;
  const marketCapSol = currentPrice * circulatingSupply;

  // Graduation progress (0-100%)
  const graduationProgress = Math.min(
    (virtualSolReserves / GRADUATION_THRESHOLD_SOL) * 100,
    100
  );

  return {
    virtualSolReserves,
    virtualTokenReserves,
    k,
    currentPrice,
    marketCapSol,
    graduationProgress,
  };
}

/**
 * Calculate how many tokens you get for a given SOL amount
 *
 * Uses constant product formula: x * y = k
 * When buying: newY = k / (x + dx)
 * tokensOut = y - newY
 */
export function calculatePurchaseAmount(
  token: PumpFunToken,
  solAmount: number
): PurchaseCalculation {
  const { virtual_sol_reserves: x, virtual_token_reserves: y } = token;
  const k = x * y;

  // New reserves after adding SOL
  const newX = x + solAmount;
  const newY = k / newX;

  // Tokens received
  const tokensOut = y - newY;
  const tokenAmount = BigInt(Math.floor(tokensOut));

  // Price impact
  const oldPrice = x / y;
  const newPrice = newX / newY;
  const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

  // Average price (SOL per token)
  const averagePrice = solAmount / tokensOut;

  return {
    tokenAmount,
    priceImpact,
    averagePrice,
    newPrice,
  };
}

/**
 * Calculate how much SOL you get for selling tokens
 *
 * When selling: newX = k / (y + dy)
 * solOut = x - newX
 */
export function calculateSellAmount(
  token: PumpFunToken,
  tokenAmount: number
): {
  solAmount: number;
  priceImpact: number;
  averagePrice: number;
} {
  const { virtual_sol_reserves: x, virtual_token_reserves: y } = token;
  const k = x * y;

  // New reserves after adding tokens
  const newY = y + tokenAmount;
  const newX = k / newY;

  // SOL received
  const solOut = x - newX;

  // Price impact (negative for sells)
  const oldPrice = x / y;
  const newPrice = newX / newY;
  const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

  // Average price
  const averagePrice = solOut / tokenAmount;

  return {
    solAmount: solOut,
    priceImpact,
    averagePrice,
  };
}

/**
 * Calculate SOL needed to buy a specific amount of tokens
 */
export function calculateSolNeeded(
  token: PumpFunToken,
  targetTokenAmount: number
): number {
  const { virtual_sol_reserves: x, virtual_token_reserves: y } = token;
  const k = x * y;

  // newY = y - targetTokenAmount
  const newY = y - targetTokenAmount;

  if (newY <= 0) {
    throw new Error("Cannot buy more tokens than available in reserves");
  }

  // newX = k / newY
  const newX = k / newY;

  // SOL needed = newX - x
  return newX - x;
}

/**
 * Calculate the minimum tokens out with slippage
 */
export function calculateMinTokensOut(
  expectedTokens: bigint,
  slippageBps: number
): bigint {
  // slippageBps: 500 = 5%
  const slippageMultiplier = BigInt(10000 - slippageBps);
  return (expectedTokens * slippageMultiplier) / BigInt(10000);
}

/**
 * Format token price for display
 */
export function formatTokenPrice(price: number): string {
  if (price < 0.000001) {
    return price.toExponential(2);
  }
  if (price < 0.001) {
    return price.toFixed(8);
  }
  if (price < 1) {
    return price.toFixed(6);
  }
  return price.toFixed(4);
}

/**
 * Format market cap for display
 */
export function formatMarketCap(marketCapSol: number, solPrice: number = 150): string {
  const marketCapUsd = marketCapSol * solPrice;

  if (marketCapUsd >= 1_000_000) {
    return `$${(marketCapUsd / 1_000_000).toFixed(2)}M`;
  }
  if (marketCapUsd >= 1_000) {
    return `$${(marketCapUsd / 1_000).toFixed(1)}K`;
  }
  return `$${marketCapUsd.toFixed(0)}`;
}

/**
 * Check if token has graduated to Raydium
 */
export function isGraduated(token: PumpFunToken): boolean {
  return token.complete;
}

/**
 * Get time since token creation
 */
export function getTokenAge(token: PumpFunToken): string {
  const now = Date.now();
  const created = token.created_timestamp * 1000;
  const diffMs = now - created;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

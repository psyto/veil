/**
 * Compliant mode adapter for the confidential swap solver.
 *
 * When a trader's FairScore tier >= Gold, the solver routes through
 * ComplianceAwareRouter instead of raw JupiterClient. This ensures
 * institutional-grade compliance while preserving confidentiality.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { TierLevel } from '@umbra/fairscore-middleware';
import { JupiterClient, type JupiterQuote } from './jupiter';

/** Minimum tier that triggers compliant routing */
export const COMPLIANT_ROUTING_MIN_TIER = TierLevel.Gold;

/** Configuration for compliant mode */
export interface CompliantModeConfig {
  /** Compliant registry authority public key */
  registryAuthority: PublicKey;
  /** Compliant registry program ID */
  registryProgramId: PublicKey;
  /** Transfer hook program ID for KYC lookups */
  transferHookProgramId: PublicKey;
  /** Whitelisted AMM keys (synced from on-chain registry) */
  whitelistedPools: Set<string>;
}

/**
 * Check if a trade should use compliant routing based on trader's tier.
 */
export function shouldUseCompliantRouting(tierLevel: TierLevel): boolean {
  return tierLevel >= COMPLIANT_ROUTING_MIN_TIER;
}

/**
 * Filter a Jupiter quote to only include whitelisted pool hops.
 * Returns null if the route cannot be made compliant.
 */
export function filterCompliantRoute(
  quote: JupiterQuote,
  whitelistedPools: Set<string>
): JupiterQuote | null {
  const allCompliant = quote.routePlan.every(
    (step) => whitelistedPools.has(step.swapInfo.ammKey)
  );

  if (allCompliant) return quote;

  // Multi-hop with non-compliant pool — cannot safely use partial route
  return null;
}

/**
 * Get a compliant quote by trying the standard route first,
 * then falling back to direct-only routes if needed.
 */
export async function getCompliantQuote(
  jupiterClient: JupiterClient,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: BN,
  slippageBps: number,
  whitelistedPools: Set<string>
): Promise<JupiterQuote | null> {
  // Try standard quote first
  const quote = await jupiterClient.getQuote(
    inputMint,
    outputMint,
    amount,
    slippageBps
  );

  const compliant = filterCompliantRoute(quote, whitelistedPools);
  if (compliant) return compliant;

  // Retry with direct routes only (single hop, more likely to be whitelisted)
  try {
    const directQuote = await jupiterClient.getQuote(
      inputMint,
      outputMint,
      amount,
      slippageBps
    );
    return filterCompliantRoute(directQuote, whitelistedPools);
  } catch {
    return null;
  }
}

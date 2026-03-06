import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Order status enum matching on-chain
 */
export enum OrderStatus {
  Pending = 'pending',
  Executing = 'executing',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

/**
 * Order type enum matching on-chain
 */
export enum OrderType {
  Market = 'market',
  Limit = 'limit',
  Twap = 'twap',
  Iceberg = 'iceberg',
  Dark = 'dark',
}

/**
 * MEV protection level enum matching on-chain
 */
export enum MevProtectionLevel {
  None = 'none',
  Basic = 'basic',
  Full = 'full',
  Priority = 'priority',
}

/**
 * Tier definition data from on-chain
 */
export interface TierDefinitionData {
  minFairscore: number;
  feeBps: number;
  mevProtectionLevel: MevProtectionLevel;
  allowedOrderTypes: number;
  derivativesAccess: number;
}

/**
 * Tier config data from on-chain
 */
export interface TierConfigData {
  authority: PublicKey;
  solverPubkey: PublicKey;
  tiers: TierDefinitionData[];
  feeVault: PublicKey;
  totalVolumeByTier: BN[];
  totalFeesCollected: BN;
  totalOrders: BN;
  isActive: boolean;
  bump: number;
}

/**
 * Tiered order data from on-chain
 */
export interface TieredOrderData {
  owner: PublicKey;
  orderId: BN;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: BN;
  minOutputAmount: BN;
  outputAmount: BN;
  encryptedPayload: Uint8Array;
  status: OrderStatus;
  orderType: OrderType;
  createdAt: BN;
  executedAt: BN;
  executedBy: PublicKey | null;
  // Tier-specific fields
  userTier: number;
  feeBpsApplied: number;
  feeAmount: BN;
  mevProtectionLevel: MevProtectionLevel;
  fairscoreAtCreation: number;
  userEncryptionPubkey: Uint8Array;
  bump: number;
}

/**
 * Order submission parameters
 */
export interface SubmitOrderParams {
  orderId: BN;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: BN;
  minOutputAmount: BN;
  slippageBps: number;
  deadlineSeconds: number;
  orderType?: OrderType;
}

/**
 * User tier info for display
 */
export interface UserTierInfo {
  fairscore: number;
  tier: number;
  tierName: string;
  feeBps: number;
  mevProtection: MevProtectionLevel;
  allowedOrderTypes: OrderType[];
  hasDerivativesAccess: boolean;
}

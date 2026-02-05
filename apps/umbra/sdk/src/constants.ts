import { PublicKey } from '@solana/web3.js';

// Program ID - replace with actual after deployment
export const PROGRAM_ID = new PublicKey('CqcA7CXYLLGcGCSTYPbN8iKruXJu38kZNciH86CVhewr');

// PDA Seeds
export const TIER_CONFIG_SEED = Buffer.from('tier_config');
export const ORDER_SEED = Buffer.from('tiered_order');
export const ORDER_VAULT_SEED = Buffer.from('order_vault');
export const OUTPUT_VAULT_SEED = Buffer.from('output_vault');
export const FEE_VAULT_SEED = Buffer.from('fee_vault');

// Constraints
export const MAX_FEE_BPS = 500;
export const MIN_FEE_BPS = 1;
export const MIN_PAYLOAD_SIZE = 24;
export const MAX_PAYLOAD_SIZE = 128;
export const MAX_FAIRSCORE = 100;
export const NUM_TIERS = 5;
export const MAX_PROOF_AGE_SECONDS = 600;

// Order type bitmasks
export const ORDER_TYPE_MARKET = 1;
export const ORDER_TYPE_LIMIT = 2;
export const ORDER_TYPE_TWAP = 4;
export const ORDER_TYPE_ICEBERG = 8;
export const ORDER_TYPE_DARK = 16;

// Derivative access bitmasks
export const DERIVATIVE_PERPETUALS = 1;
export const DERIVATIVE_VARIANCE = 2;
export const DERIVATIVE_EXOTIC = 4;

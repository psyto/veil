export { UmbraClient, TieredSolverClient } from './client';
export { encryptOrderPayload, decryptOrderPayload, createEncryptedOrder } from './encryption';
export {
  PROGRAM_ID,
  TIER_CONFIG_SEED,
  ORDER_SEED,
  ORDER_VAULT_SEED,
  OUTPUT_VAULT_SEED,
  FEE_VAULT_SEED,
} from './constants';
export {
  TierConfigData,
  TieredOrderData,
  TierDefinitionData,
  OrderStatus,
  OrderType,
  MevProtectionLevel,
} from './types';

// Re-export from fairscore middleware
export {
  FairScoreClient,
  TierCalculator,
  TierLevel,
  TierBenefits,
} from '@umbra/fairscore-middleware';

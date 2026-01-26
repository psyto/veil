// Encryption utilities
export {
  OrderPayload,
  EncryptedPayload,
  EncryptionKeypair,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptOrderPayload,
  decryptOrderPayload,
  createEncryptedOrder,
  validateEncryptedPayload,
  getEncryptionPublicKey,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  serializeOrderPayload,
  deserializeOrderPayload,
  // ZK Compression exports
  ZkOrderConfig,
  ZkEncryptedOrder,
  createZkEncryptedOrder,
  decryptZkOrder,
  shieldSwapOutput,
  unshieldForSwap,
  estimateOrderCompressionSavings,
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  estimateCompressionSavings,
} from './encryption';

// Client classes
export {
  PROGRAM_ID,
  SOLVER_CONFIG_SEED,
  ORDER_SEED,
  ORDER_VAULT_SEED,
  OUTPUT_VAULT_SEED,
  OrderStatus,
  OrderData,
  SolverConfigData,
  ConfidentialSwapClient,
  SolverClient,
} from './client';

// NaCl Box encryption (Curve25519-XSalsa20-Poly1305)
export {
  EncryptionKeypair,
  EncryptedData,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptForMultiple,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  validateEncryptedData,
} from './nacl-box';

// Threshold secret sharing (Shamir's)
export {
  SecretShare,
  ThresholdConfig,
  splitSecret,
  combineShares,
  verifyShares,
  createThresholdEncryption,
  decryptWithThreshold,
} from './threshold';

// Payload serialization
export {
  FieldType,
  FieldDef,
  PayloadSchema,
  calculateSchemaSize,
  serializePayload,
  deserializePayload,
  SWAP_ORDER_SCHEMA,
  RWA_ASSET_SCHEMA,
  RWA_ACCESS_GRANT_SCHEMA,
} from './payload';

// ZK Compression (Light Protocol)
export {
  ZkCompressionConfig,
  CompressedAccount,
  CompressedPayload,
  CompressedTokenInfo,
  createZkRpc,
  createStandardConnection,
  compressData,
  decompressData,
  createCompressedMint,
  mintCompressedTokens,
  transferCompressedTokens,
  getCompressedTokenBalance,
  compressTokenAccount,
  decompressTokenAccount,
  estimateCompressionSavings,
} from './zk-compression';

// Shielded Transfers (Privacy Cash)
export {
  PrivacyCashConfig,
  ShieldedBalance,
  DepositResult,
  WithdrawalResult,
  ShieldedTransferParams,
  PrivacyCashClient,
  createShieldedTransfer,
  verifyShieldedProof,
  estimateShieldedFee,
  isPrivacyCashAvailable,
  shieldTokens,
  unshieldTokens,
} from './shielded';

// RPC Provider Configuration (Helius, Quicknode)
export {
  RpcProvider,
  Network,
  RpcProviderConfig,
  RpcConnections,
  createRpcConnections,
  createHeliusRpc,
  createQuicknodeRpc,
  createRpcFromEnv,
  getRpcAttribution,
  createPublicRpc,
  RPC_ENV_VARS,
  PUBLIC_RPC_ENDPOINTS,
} from './rpc-providers';

// Encryption utilities
export {
  EncryptionKeypair,
  SecretShare,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
  RwaAssetMetadata,
  serializeAssetMetadata,
  deserializeAssetMetadata,
  encryptAssetMetadata,
  decryptAssetMetadata,
  createKeyShareForGrantee,
  decryptKeyShare,
  createThresholdEncryptedMetadata,
  decryptThresholdMetadata,
  hashLegalDocument,
  generateAssetId,
} from './encryption';

// Client
export {
  RWA_SECRETS_PROGRAM_ID,
  AccessLevel,
  AssetType,
  AccessType,
  AssetData,
  AccessGrantData,
  RwaSecretsClient,
  createRwaSecretsClient,
} from './client';

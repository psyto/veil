import {
  EncryptionKeypair,
  EncryptedData,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
  SecretShare,
} from '@privacy-suite/crypto';

// Re-export common crypto functions
export {
  EncryptionKeypair,
  SecretShare,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
};

/**
 * RWA Asset metadata structure (encrypted on-chain)
 */
export interface RwaAssetMetadata {
  /** Asset valuation in USD cents */
  valuationUsdCents: bigint;
  /** Legal document hash (SHA-256) */
  legalDocHash: Uint8Array;
  /** Ownership percentage in basis points (10000 = 100%) */
  ownershipBps: number;
  /** Jurisdiction code (ISO 3166-1 alpha-2) */
  jurisdictionCode: string;
  /** Additional metadata (JSON string) */
  additionalInfo?: string;
}

/**
 * Serialize RWA asset metadata to bytes
 */
export function serializeAssetMetadata(metadata: RwaAssetMetadata): Uint8Array {
  const jurisdictionBytes = new TextEncoder().encode(
    metadata.jurisdictionCode.padEnd(2, ' ').slice(0, 2)
  );
  const additionalBytes = metadata.additionalInfo
    ? new TextEncoder().encode(metadata.additionalInfo)
    : new Uint8Array(0);

  // Fixed size: 8 (valuation) + 32 (hash) + 2 (bps) + 2 (jurisdiction) + 2 (additionalLen) = 46
  // Variable: additionalInfo length
  const fixedSize = 46;
  const buffer = new ArrayBuffer(fixedSize + additionalBytes.length);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // valuationUsdCents: 8 bytes (u64 LE)
  view.setBigUint64(offset, metadata.valuationUsdCents, true);
  offset += 8;

  // legalDocHash: 32 bytes
  bytes.set(metadata.legalDocHash.slice(0, 32), offset);
  offset += 32;

  // ownershipBps: 2 bytes (u16 LE)
  view.setUint16(offset, metadata.ownershipBps, true);
  offset += 2;

  // jurisdictionCode: 2 bytes
  bytes.set(jurisdictionBytes.slice(0, 2), offset);
  offset += 2;

  // additionalInfo length: 2 bytes (u16 LE)
  view.setUint16(offset, additionalBytes.length, true);
  offset += 2;

  // additionalInfo: variable
  bytes.set(additionalBytes, offset);

  return bytes;
}

/**
 * Deserialize bytes back to RWA asset metadata
 */
export function deserializeAssetMetadata(bytes: Uint8Array): RwaAssetMetadata {
  if (bytes.length < 46) {
    throw new Error('Metadata too short');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  // valuationUsdCents
  const valuationUsdCents = view.getBigUint64(offset, true);
  offset += 8;

  // legalDocHash
  const legalDocHash = bytes.slice(offset, offset + 32);
  offset += 32;

  // ownershipBps
  const ownershipBps = view.getUint16(offset, true);
  offset += 2;

  // jurisdictionCode
  const jurisdictionCode = new TextDecoder().decode(bytes.slice(offset, offset + 2)).trim();
  offset += 2;

  // additionalInfo length
  const additionalLen = view.getUint16(offset, true);
  offset += 2;

  // additionalInfo
  const additionalInfo = additionalLen > 0
    ? new TextDecoder().decode(bytes.slice(offset, offset + additionalLen))
    : undefined;

  return {
    valuationUsdCents,
    legalDocHash,
    ownershipBps,
    jurisdictionCode,
    additionalInfo,
  };
}

/**
 * Encrypt RWA asset metadata for on-chain storage
 */
export function encryptAssetMetadata(
  metadata: RwaAssetMetadata,
  issuerKeypair: EncryptionKeypair
): EncryptedData {
  const plaintext = serializeAssetMetadata(metadata);
  return encrypt(plaintext, issuerKeypair.publicKey, issuerKeypair);
}

/**
 * Decrypt RWA asset metadata
 */
export function decryptAssetMetadata(
  encryptedBytes: Uint8Array,
  issuerPublicKey: Uint8Array,
  decryptorKeypair: EncryptionKeypair
): RwaAssetMetadata {
  const plaintext = decrypt(encryptedBytes, issuerPublicKey, decryptorKeypair);
  return deserializeAssetMetadata(plaintext);
}

/**
 * Create an encrypted key share for a grantee
 */
export function createKeyShareForGrantee(
  issuerKeypair: EncryptionKeypair,
  granteePublicKey: Uint8Array
): Uint8Array {
  const encrypted = encrypt(
    issuerKeypair.secretKey,
    granteePublicKey,
    issuerKeypair
  );
  return encrypted.bytes;
}

/**
 * Decrypt a key share received from issuer
 */
export function decryptKeyShare(
  encryptedKeyShare: Uint8Array,
  issuerPublicKey: Uint8Array,
  granteeKeypair: EncryptionKeypair
): Uint8Array {
  return decrypt(encryptedKeyShare, issuerPublicKey, granteeKeypair);
}

/**
 * Create threshold-encrypted metadata
 */
export function createThresholdEncryptedMetadata(
  metadata: RwaAssetMetadata,
  threshold: number,
  totalParties: number,
  partyPublicKeys: Uint8Array[]
): {
  encryptedMetadata: Uint8Array;
  keyShares: { partyIndex: number; encryptedShare: Uint8Array }[];
} {
  if (partyPublicKeys.length !== totalParties) {
    throw new Error(`Expected ${totalParties} public keys, got ${partyPublicKeys.length}`);
  }

  const plaintext = serializeAssetMetadata(metadata);
  const tempKeypair = generateEncryptionKeypair();

  // Encrypt metadata with temp key
  const encryptedMetadata = encrypt(plaintext, tempKeypair.publicKey, tempKeypair);

  // Split the temp secret key
  const shares = splitSecret(tempKeypair.secretKey, threshold, totalParties);

  // Encrypt each share for its corresponding party
  const keyShares = shares.map((share, index) => {
    const shareBytes = new Uint8Array(share.value.length + 1);
    shareBytes[0] = share.index;
    shareBytes.set(share.value, 1);

    const encryptedShare = encrypt(shareBytes, partyPublicKeys[index], tempKeypair);
    return {
      partyIndex: index,
      encryptedShare: encryptedShare.bytes,
    };
  });

  return {
    encryptedMetadata: encryptedMetadata.bytes,
    keyShares,
  };
}

/**
 * Decrypt threshold-encrypted metadata
 */
export function decryptThresholdMetadata(
  encryptedMetadata: Uint8Array,
  decryptedShares: SecretShare[],
  tempPublicKey: Uint8Array
): RwaAssetMetadata {
  const tempSecretKey = combineShares(decryptedShares);

  const tempKeypair: EncryptionKeypair = {
    publicKey: tempPublicKey,
    secretKey: tempSecretKey,
  };

  const plaintext = decrypt(encryptedMetadata, tempPublicKey, tempKeypair);
  return deserializeAssetMetadata(plaintext);
}

/**
 * Hash a legal document for on-chain reference
 */
export async function hashLegalDocument(document: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', document);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate a unique asset ID from off-chain asset identifier
 */
export async function generateAssetId(offChainId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(offChainId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

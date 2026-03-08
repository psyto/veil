import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Keypair for X25519 encryption operations.
 * Chain-agnostic — works with any blockchain or off-chain context.
 */
export interface EncryptionKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  bytes: Uint8Array;
}

/**
 * Generate a new X25519 encryption keypair
 */
export function generateEncryptionKeypair(): EncryptionKeypair {
  const keypair = nacl.box.keyPair();
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  };
}

/**
 * Derive encryption keypair deterministically from a seed (e.g., wallet secret key)
 */
export function deriveEncryptionKeypair(seed: Uint8Array): EncryptionKeypair {
  const seedBytes = seed.slice(0, 32);
  const keypair = nacl.box.keyPair.fromSecretKey(seedBytes);
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  };
}

/**
 * Encrypt data using NaCl box (Curve25519-XSalsa20-Poly1305)
 *
 * @param plaintext - Data to encrypt
 * @param recipientPublicKey - Recipient's X25519 public key
 * @param senderKeypair - Sender's encryption keypair
 * @returns Encrypted data with nonce
 */
export function encrypt(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderKeypair: EncryptionKeypair
): EncryptedData {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const ciphertext = nacl.box(
    plaintext,
    nonce,
    recipientPublicKey,
    senderKeypair.secretKey
  );

  // Combine nonce + ciphertext for storage
  const bytes = new Uint8Array(nonce.length + ciphertext.length);
  bytes.set(nonce, 0);
  bytes.set(ciphertext, nonce.length);

  return { nonce, ciphertext, bytes };
}

/**
 * Decrypt data using NaCl box
 *
 * @param encryptedBytes - Combined nonce + ciphertext
 * @param senderPublicKey - Sender's X25519 public key
 * @param recipientKeypair - Recipient's encryption keypair
 * @returns Decrypted plaintext
 */
export function decrypt(
  encryptedBytes: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientKeypair: EncryptionKeypair
): Uint8Array {
  if (encryptedBytes.length < nacl.box.nonceLength + nacl.box.overheadLength) {
    throw new Error('Encrypted data too short');
  }

  const nonce = encryptedBytes.slice(0, nacl.box.nonceLength);
  const ciphertext = encryptedBytes.slice(nacl.box.nonceLength);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientKeypair.secretKey
  );

  if (!plaintext) {
    throw new Error('Decryption failed - invalid ciphertext or wrong keys');
  }

  return plaintext;
}

/**
 * Encrypt data for multiple recipients
 * Each recipient gets their own encrypted copy
 */
export function encryptForMultiple(
  plaintext: Uint8Array,
  recipientPublicKeys: Uint8Array[],
  senderKeypair: EncryptionKeypair
): Map<string, EncryptedData> {
  const results = new Map<string, EncryptedData>();

  for (const recipientPubkey of recipientPublicKeys) {
    const encrypted = encrypt(plaintext, recipientPubkey, senderKeypair);
    const keyHex = Buffer.from(recipientPubkey).toString('hex');
    results.set(keyHex, encrypted);
  }

  return results;
}

/**
 * Convert encryption public key to base58 string.
 * Chain-agnostic — base58 encoding is used by Solana, Bitcoin, and others.
 */
export function encryptionKeyToBase58(publicKey: Uint8Array): string {
  return bs58.encode(publicKey);
}

/**
 * Convert base58 string to encryption public key bytes.
 * Chain-agnostic — base58 encoding is used by Solana, Bitcoin, and others.
 */
export function base58ToEncryptionKey(base58Str: string): Uint8Array {
  return bs58.decode(base58Str);
}

/**
 * Convert encryption public key to EVM-style hex address (0x-prefixed).
 * Useful for interoperability with Ethereum, Polygon, Arbitrum, etc.
 */
export function encryptionKeyToHex(publicKey: Uint8Array): string {
  return '0x' + Buffer.from(publicKey).toString('hex');
}

/**
 * Convert an EVM-style hex string (0x-prefixed or plain hex) to encryption key bytes.
 * Useful for interoperability with Ethereum, Polygon, Arbitrum, etc.
 */
export function hexToEncryptionKey(hex: string): Uint8Array {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(cleaned, 'hex'));
}

/**
 * Validate encrypted data structure
 */
export function validateEncryptedData(
  bytes: Uint8Array,
  minPlaintextSize: number = 1,
  maxPlaintextSize: number = 1024
): boolean {
  const minSize = nacl.box.nonceLength + nacl.box.overheadLength + minPlaintextSize;
  const maxSize = nacl.box.nonceLength + nacl.box.overheadLength + maxPlaintextSize;

  return bytes.length >= minSize && bytes.length <= maxSize;
}

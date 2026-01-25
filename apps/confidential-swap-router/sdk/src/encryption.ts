import {
  EncryptionKeypair,
  EncryptedData,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  validateEncryptedData,
  serializePayload,
  deserializePayload,
  SWAP_ORDER_SCHEMA,
} from '@privacy-suite/crypto';
import BN from 'bn.js';

// Re-export common crypto functions
export {
  EncryptionKeypair,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
};

/**
 * Order payload structure to be encrypted
 * This contains the sensitive order details that should not be visible to MEV searchers
 */
export interface OrderPayload {
  /** Minimum output amount the user expects */
  minOutputAmount: BN;
  /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippageBps: number;
  /** Order expiration timestamp (unix seconds) */
  deadline: number;
  /** Optional: additional routing hints */
  routingHint?: Uint8Array;
}

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  /** 24-byte nonce used for encryption */
  nonce: Uint8Array;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
  /** Combined bytes for on-chain storage */
  bytes: Uint8Array;
}

/**
 * Serialize order payload to bytes using shared schema
 */
export function serializeOrderPayload(payload: OrderPayload): Uint8Array {
  return serializePayload({
    minOutputAmount: payload.minOutputAmount.toArrayLike(Buffer, 'le', 8),
    slippageBps: payload.slippageBps,
    deadline: payload.deadline,
    padding: new Uint8Array(6),
  }, SWAP_ORDER_SCHEMA);
}

/**
 * Deserialize bytes back to order payload using shared schema
 */
export function deserializeOrderPayload(bytes: Uint8Array): OrderPayload {
  const data = deserializePayload(bytes, SWAP_ORDER_SCHEMA);
  return {
    minOutputAmount: data.minOutputAmount as BN,
    slippageBps: data.slippageBps as number,
    deadline: data.deadline as number,
    routingHint: undefined, // routingHint not in fixed schema
  };
}

/**
 * Encrypt an order payload using NaCl box
 *
 * @param payload - The order payload to encrypt
 * @param solverPublicKey - The solver's X25519 public key (32 bytes)
 * @param userKeypair - The user's encryption keypair
 * @returns Encrypted payload with nonce
 */
export function encryptOrderPayload(
  payload: OrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair
): EncryptedPayload {
  const plaintext = serializeOrderPayload(payload);
  const encrypted = encrypt(plaintext, solverPublicKey, userKeypair);
  return {
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
    bytes: encrypted.bytes,
  };
}

/**
 * Decrypt an order payload using NaCl box
 *
 * @param encryptedBytes - The combined nonce + ciphertext from on-chain
 * @param userPublicKey - The user's X25519 public key (32 bytes)
 * @param solverKeypair - The solver's encryption keypair
 * @returns Decrypted order payload
 */
export function decryptOrderPayload(
  encryptedBytes: Uint8Array,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair
): OrderPayload {
  const plaintext = decrypt(encryptedBytes, userPublicKey, solverKeypair);
  return deserializeOrderPayload(plaintext);
}

/**
 * Create an encrypted order payload ready for on-chain submission
 * Convenience function that handles all encryption steps
 */
export function createEncryptedOrder(
  minOutputAmount: BN | number | string,
  slippageBps: number,
  deadlineInSeconds: number,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
  routingHint?: Uint8Array
): Uint8Array {
  const payload: OrderPayload = {
    minOutputAmount: new BN(minOutputAmount),
    slippageBps,
    deadline: deadlineInSeconds,
    routingHint,
  };

  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);
  return encrypted.bytes;
}

/**
 * Validate that an encrypted payload has the correct structure
 */
export function validateEncryptedPayload(bytes: Uint8Array): boolean {
  // Minimum size: 24 (nonce) + 16 (auth tag) + 24 (min payload) = 64 bytes
  if (bytes.length < 64) {
    return false;
  }
  // Maximum size: 128 bytes (as defined in the program)
  if (bytes.length > 128) {
    return false;
  }
  return validateEncryptedData(bytes);
}

/**
 * Get the user's public key for encryption from their keypair
 * This should be shared with the solver so they can decrypt orders
 */
export function getEncryptionPublicKey(keypair: EncryptionKeypair): Uint8Array {
  return keypair.publicKey;
}

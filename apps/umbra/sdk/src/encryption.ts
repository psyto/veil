import {
  EncryptionKeypair,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  SWAP_ORDER_SCHEMA,
} from '@privacy-suite/crypto';
import { BN } from '@coral-xyz/anchor';

// Re-export encryption utilities
export {
  EncryptionKeypair,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
};

/**
 * Order payload structure to be encrypted
 */
export interface OrderPayload {
  minOutputAmount: BN;
  slippageBps: number;
  deadline: number;
  routingHint?: Uint8Array;
}

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  bytes: Uint8Array;
}

/**
 * Serialize order payload to bytes
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
 * Deserialize bytes to order payload
 */
export function deserializeOrderPayload(bytes: Uint8Array): OrderPayload {
  const data = deserializePayload(bytes, SWAP_ORDER_SCHEMA);
  return {
    minOutputAmount: data.minOutputAmount as BN,
    slippageBps: data.slippageBps as number,
    deadline: data.deadline as number,
  };
}

/**
 * Encrypt an order payload
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
 * Decrypt an order payload
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
 * Create encrypted order bytes for on-chain submission
 */
export function createEncryptedOrder(
  minOutputAmount: BN | number | string,
  slippageBps: number,
  deadlineInSeconds: number,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair
): Uint8Array {
  const payload: OrderPayload = {
    minOutputAmount: new BN(minOutputAmount),
    slippageBps,
    deadline: deadlineInSeconds,
  };

  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);
  return encrypted.bytes;
}

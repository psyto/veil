import {
  EncryptionKeypair,
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  validateEncryptedData,
  SWAP_ORDER_SCHEMA,
} from '@veil/core';
import BN from 'bn.js';

/**
 * Supported address formats for chain-agnostic order payloads.
 * - 'base58': Solana, Bitcoin, and other base58-encoded addresses
 * - 'hex': EVM-compatible 0x-prefixed hex addresses (Ethereum, Polygon, Arbitrum, etc.)
 * - 'bytes': Raw 32-byte public key (chain-agnostic default)
 */
export type AddressFormat = 'base58' | 'hex' | 'bytes';

/**
 * Order payload structure to be encrypted.
 * Chain-agnostic — works with any DEX swap order, not just Solana.
 * Contains sensitive order details that should not be visible to MEV searchers.
 */
export interface OrderPayload {
  /** Minimum output amount the user expects (in smallest token unit) */
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
 * Serialize order payload to bytes using the shared swap order schema
 */
export function serializeOrderPayload(payload: OrderPayload): Uint8Array {
  return serializePayload({
    minOutputAmount: payload.minOutputAmount,
    slippageBps: payload.slippageBps,
    deadline: payload.deadline,
    padding: new Uint8Array(6),
  }, SWAP_ORDER_SCHEMA);
}

/**
 * Deserialize bytes back to order payload
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
 * Encrypt an order payload using NaCl box.
 * Chain-agnostic — works with any DEX or exchange that uses encrypted order flow.
 *
 * @param payload - The order payload to encrypt
 * @param solverPublicKey - The solver/relayer's X25519 public key (32 bytes)
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
 * Decrypt an order payload using NaCl box.
 * Chain-agnostic — works with any DEX or exchange that uses encrypted order flow.
 *
 * @param encryptedBytes - The combined nonce + ciphertext (from on-chain or off-chain transport)
 * @param userPublicKey - The user's X25519 public key (32 bytes)
 * @param solverKeypair - The solver/relayer's encryption keypair
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
 * Create an encrypted order payload ready for submission.
 * Chain-agnostic convenience function that handles all encryption steps.
 * Works with Solana, EVM chains, or any blockchain using encrypted order flow.
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
  if (bytes.length < 64) return false;
  if (bytes.length > 128) return false;
  return validateEncryptedData(bytes);
}

/**
 * Get the user's public key for encryption from their keypair.
 * This should be shared with the solver so they can decrypt orders.
 */
export function getEncryptionPublicKey(keypair: EncryptionKeypair): Uint8Array {
  return keypair.publicKey;
}

// Re-export commonly needed crypto types and address conversion utilities
export type { EncryptionKeypair } from '@veil/core';
export {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  // Base58 address conversion (Solana, Bitcoin, etc.)
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  // EVM hex address conversion (Ethereum, Polygon, Arbitrum, etc.)
  encryptionKeyToHex,
  hexToEncryptionKey,
} from '@veil/core';

/**
 * Detect the address format of a string.
 * Returns 'hex' for 0x-prefixed strings, 'base58' otherwise.
 */
export function detectAddressFormat(address: string): AddressFormat {
  if (address.startsWith('0x') || address.startsWith('0X')) {
    return 'hex';
  }
  return 'base58';
}

/**
 * Convert an address string to raw bytes, auto-detecting the format.
 * Supports both EVM hex (0x...) and base58 (Solana/Bitcoin) addresses.
 */
export function addressToBytes(address: string): Uint8Array {
  const format = detectAddressFormat(address);
  if (format === 'hex') {
    const cleaned = address.slice(2);
    return new Uint8Array(Buffer.from(cleaned, 'hex'));
  }
  // base58
  const { base58ToEncryptionKey: fromBase58 } = require('@veil/core');
  return fromBase58(address);
}

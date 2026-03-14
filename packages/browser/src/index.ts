/**
 * @fabrknt/veil-browser — Client-side encryption SDK for Veil
 *
 * All encryption/decryption happens locally in the browser.
 * No secret keys ever leave the user's device.
 *
 * @example
 * ```typescript
 * import { VeilClient } from '@fabrknt/veil-browser';
 *
 * const client = VeilClient.create();
 *
 * // Encrypt an order for a solver
 * const order = client.encryptOrder({
 *   minOutputAmount: '1000000',
 *   slippageBps: 50,
 *   deadline: Math.floor(Date.now() / 1000) + 300,
 *   solverPublicKey: solverPubKeyBytes,
 * });
 *
 * // Submit order.encryptedBytes and order.payloadHash on-chain
 * ```
 */

import {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptForMultiple,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  encryptionKeyToHex,
  hexToEncryptionKey,
  validateEncryptedData,
  splitSecret,
  combineShares,
  verifyShares,
  type EncryptionKeypair,
  type EncryptedData,
  type SecretShare,
} from '@fabrknt/veil-core';

import {
  createEncryptedOrder,
  createCommittedEncryptedOrder,
  createThresholdEncryptedOrder,
  decryptSolverShare,
  reconstructThresholdOrder,
  encryptOrderPayload,
  decryptOrderPayload,
  serializeOrderPayload,
  deserializeOrderPayload,
  computePayloadHash,
  validateEncryptedPayload,
  type OrderPayload,
  type EncryptedPayload,
  type EncryptedOrderWithCommitment,
  type ThresholdEncryptedOrder,
  type ThresholdSolverShare,
} from '@fabrknt/veil-orders';

import BN from 'bn.js';

/**
 * Options for creating an encrypted order
 */
export interface EncryptOrderOptions {
  minOutputAmount: string | number | BN;
  slippageBps: number;
  deadline: number;
  solverPublicKey: Uint8Array | string;
}

/**
 * Options for creating a threshold-encrypted order
 */
export interface ThresholdOrderOptions extends EncryptOrderOptions {
  threshold: number;
  solverPublicKeys: (Uint8Array | string)[];
}

/**
 * Result of encrypting an order
 */
export interface ClientEncryptedOrder {
  encryptedBytes: Uint8Array;
  payloadHash: Uint8Array;
  userPublicKey: Uint8Array;
  userPublicKeyHex: string;
  userPublicKeyBase58: string;
}

/**
 * VeilClient — browser-safe encryption client.
 *
 * Holds the user's encryption keypair in memory and provides
 * high-level methods for order encryption and data privacy.
 * All cryptographic operations execute locally.
 */
export class VeilClient {
  private keypair: EncryptionKeypair;

  private constructor(keypair: EncryptionKeypair) {
    this.keypair = keypair;
  }

  /**
   * Create a new VeilClient with a random keypair
   */
  static create(): VeilClient {
    return new VeilClient(generateEncryptionKeypair());
  }

  /**
   * Create a VeilClient from a deterministic seed (e.g., derived from wallet signature)
   */
  static fromSeed(seed: Uint8Array): VeilClient {
    return new VeilClient(deriveEncryptionKeypair(seed));
  }

  /**
   * Create a VeilClient from an existing keypair
   */
  static fromKeypair(keypair: EncryptionKeypair): VeilClient {
    return new VeilClient(keypair);
  }

  /**
   * Get the user's public encryption key
   */
  get publicKey(): Uint8Array {
    return this.keypair.publicKey;
  }

  get publicKeyHex(): string {
    return encryptionKeyToHex(this.keypair.publicKey);
  }

  get publicKeyBase58(): string {
    return encryptionKeyToBase58(this.keypair.publicKey);
  }

  /**
   * Encrypt an order for a single solver with commitment hash.
   * The payloadHash should be submitted on-chain alongside the encrypted bytes.
   */
  encryptOrder(options: EncryptOrderOptions): ClientEncryptedOrder {
    const solverPubKey = typeof options.solverPublicKey === 'string'
      ? (options.solverPublicKey.startsWith('0x')
        ? hexToEncryptionKey(options.solverPublicKey)
        : base58ToEncryptionKey(options.solverPublicKey))
      : options.solverPublicKey;

    const committed = createCommittedEncryptedOrder(
      options.minOutputAmount instanceof BN
        ? options.minOutputAmount
        : new BN(String(options.minOutputAmount)),
      options.slippageBps,
      options.deadline,
      solverPubKey,
      this.keypair,
    );

    return {
      encryptedBytes: committed.encryptedBytes,
      payloadHash: committed.payloadHash,
      userPublicKey: committed.userPublicKey,
      userPublicKeyHex: this.publicKeyHex,
      userPublicKeyBase58: this.publicKeyBase58,
    };
  }

  /**
   * Encrypt an order for M-of-N threshold solvers.
   * Requires multiple solvers to cooperate for decryption.
   */
  encryptThresholdOrder(options: ThresholdOrderOptions): ThresholdEncryptedOrder {
    const solverPubKeys = options.solverPublicKeys.map(k =>
      typeof k === 'string'
        ? (k.startsWith('0x') ? hexToEncryptionKey(k) : base58ToEncryptionKey(k))
        : k
    );

    const payload: OrderPayload = {
      minOutputAmount: options.minOutputAmount instanceof BN
        ? options.minOutputAmount
        : new BN(String(options.minOutputAmount)),
      slippageBps: options.slippageBps,
      deadline: options.deadline,
    };

    return createThresholdEncryptedOrder(
      payload,
      options.threshold,
      solverPubKeys,
      this.keypair,
    );
  }

  /**
   * Encrypt arbitrary data for a recipient
   */
  encrypt(plaintext: Uint8Array, recipientPublicKey: Uint8Array): EncryptedData {
    return encrypt(plaintext, recipientPublicKey, this.keypair);
  }

  /**
   * Decrypt data received from a sender
   */
  decrypt(encryptedBytes: Uint8Array, senderPublicKey: Uint8Array): Uint8Array {
    return decrypt(encryptedBytes, senderPublicKey, this.keypair);
  }

  /**
   * Encrypt data for multiple recipients at once
   */
  encryptForMultiple(
    plaintext: Uint8Array,
    recipientPublicKeys: Uint8Array[],
  ): Map<string, EncryptedData> {
    return encryptForMultiple(plaintext, recipientPublicKeys, this.keypair);
  }

  /**
   * Split a secret using Shamir's Secret Sharing
   */
  splitSecret(secret: Uint8Array, threshold: number, totalShares: number): SecretShare[] {
    return splitSecret(secret, threshold, totalShares);
  }

  /**
   * Combine Shamir shares to reconstruct a secret
   */
  combineShares(shares: SecretShare[]): Uint8Array {
    return combineShares(shares);
  }

  /**
   * Destroy the keypair from memory (best-effort cleanup)
   */
  destroy(): void {
    this.keypair.secretKey.fill(0);
  }
}

// Re-export types for consumers
export type {
  EncryptionKeypair,
  EncryptedData,
  SecretShare,
  OrderPayload,
  EncryptedPayload,
  EncryptedOrderWithCommitment,
  ThresholdEncryptedOrder,
  ThresholdSolverShare,
};

// Re-export utility functions
export {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  encryptionKeyToHex,
  hexToEncryptionKey,
  validateEncryptedData,
  validateEncryptedPayload,
  computePayloadHash,
  splitSecret,
  combineShares,
  verifyShares,
};

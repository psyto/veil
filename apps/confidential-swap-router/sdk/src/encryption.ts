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
  // ZK Compression imports
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  compressData,
  decompressData,
  estimateCompressionSavings,
  // Shielded transfer imports
  PrivacyCashClient,
  ShieldedTransferParams,
  createShieldedTransfer,
  shieldTokens,
  unshieldTokens,
} from '@privacy-suite/crypto';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
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

// ============================================================================
// ZK Compression Enhanced Functions
// ============================================================================

/**
 * Configuration for ZK-enhanced order encryption
 */
export interface ZkOrderConfig {
  /** RPC endpoint URL (must support Light Protocol, e.g., Helius) */
  rpcUrl: string;
  /** Enable ZK compression for smaller on-chain footprint */
  enableCompression: boolean;
  /** Enable shielded settlement for output tokens */
  enableShieldedSettlement: boolean;
}

/**
 * ZK-enhanced encrypted order payload
 */
export interface ZkEncryptedOrder {
  /** The encrypted order bytes */
  encryptedBytes: Uint8Array;
  /** ZK compression proof (if compression enabled) */
  compressionProof?: Uint8Array;
  /** Public inputs for verification */
  publicInputs?: Uint8Array;
  /** Whether the order uses shielded settlement */
  shieldedSettlement: boolean;
  /** Estimated savings from compression in lamports */
  estimatedSavings?: bigint;
}

/**
 * Create a ZK-compressed encrypted order
 *
 * This creates an encrypted order with optional ZK compression,
 * reducing on-chain storage costs by ~99%.
 *
 * @param payload - The order payload to encrypt
 * @param solverPublicKey - The solver's encryption public key
 * @param userKeypair - The user's encryption keypair
 * @param payer - Keypair to pay for compression (if enabled)
 * @param config - ZK configuration
 * @returns ZK-enhanced encrypted order
 *
 * @example
 * ```typescript
 * const zkOrder = await createZkEncryptedOrder(
 *   { minOutputAmount: new BN(1000000), slippageBps: 50, deadline: 1234567890 },
 *   solverPubkey,
 *   userKeypair,
 *   payerKeypair,
 *   { rpcUrl: 'https://devnet.helius-rpc.com?api-key=YOUR_KEY', enableCompression: true, enableShieldedSettlement: false }
 * );
 * ```
 */
export async function createZkEncryptedOrder(
  payload: OrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
  payer: Keypair,
  config: ZkOrderConfig
): Promise<ZkEncryptedOrder> {
  // First, create the standard encrypted payload
  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);

  // If compression is not enabled, return standard encrypted order
  if (!config.enableCompression) {
    return {
      encryptedBytes: encrypted.bytes,
      shieldedSettlement: config.enableShieldedSettlement,
    };
  }

  // Calculate estimated savings
  const savings = estimateCompressionSavings(encrypted.bytes.length);

  // Create ZK RPC connection
  const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

  try {
    // Compress the encrypted data using Light Protocol
    const compressed = await compressData(rpc, encrypted.bytes, payer);

    return {
      encryptedBytes: compressed.compressedData,
      compressionProof: compressed.proof,
      publicInputs: compressed.publicInputs,
      shieldedSettlement: config.enableShieldedSettlement,
      estimatedSavings: savings.savings,
    };
  } catch (error) {
    // Fall back to uncompressed if compression fails
    console.warn('ZK compression failed, falling back to uncompressed:', error);
    return {
      encryptedBytes: encrypted.bytes,
      shieldedSettlement: config.enableShieldedSettlement,
    };
  }
}

/**
 * Decrypt a ZK-compressed order
 *
 * @param zkOrder - The ZK-enhanced encrypted order
 * @param userPublicKey - The user's encryption public key
 * @param solverKeypair - The solver's encryption keypair
 * @param config - ZK configuration (if compression was used)
 * @returns Decrypted order payload
 */
export async function decryptZkOrder(
  zkOrder: ZkEncryptedOrder,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair,
  config?: ZkOrderConfig
): Promise<OrderPayload> {
  let encryptedBytes = zkOrder.encryptedBytes;

  // If the order has compression proof, decompress first
  if (zkOrder.compressionProof && zkOrder.publicInputs && config) {
    const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

    const compressedPayload: CompressedPayload = {
      compressedData: zkOrder.encryptedBytes,
      proof: zkOrder.compressionProof,
      publicInputs: zkOrder.publicInputs,
      stateTreeRoot: new Uint8Array(32), // Would be fetched from chain
      dataHash: zkOrder.publicInputs, // Using publicInputs as dataHash
    };

    encryptedBytes = await decompressData(rpc, compressedPayload);
  }

  // Decrypt the payload
  return decryptOrderPayload(encryptedBytes, userPublicKey, solverKeypair);
}

/**
 * Execute a swap with shielded settlement
 *
 * This executes the swap and shields the output tokens using Privacy Cash,
 * providing privacy for the received tokens.
 *
 * @param connection - Solana connection
 * @param wallet - User's wallet keypair
 * @param outputAmount - Amount of output tokens received
 * @param outputMint - Output token mint (SOL, USDC, or USDT)
 * @returns Transaction signature for the shielding operation
 */
export async function shieldSwapOutput(
  connection: Connection,
  wallet: Keypair,
  outputAmount: bigint,
  outputMint: 'SOL' | 'USDC' | 'USDT'
): Promise<string> {
  const result = await shieldTokens(connection, wallet, outputAmount, outputMint);
  return result.signature;
}

/**
 * Unshield tokens before a swap
 *
 * This unshields tokens from Privacy Cash before using them in a swap.
 *
 * @param connection - Solana connection
 * @param wallet - User's wallet keypair
 * @param amount - Amount to unshield
 * @param recipient - Recipient address (usually the user's own address)
 * @param tokenType - Token type (SOL, USDC, or USDT)
 * @returns Transaction signature for the unshielding operation
 */
export async function unshieldForSwap(
  connection: Connection,
  wallet: Keypair,
  amount: bigint,
  recipient: PublicKey,
  tokenType: 'SOL' | 'USDC' | 'USDT'
): Promise<string> {
  const result = await unshieldTokens(connection, wallet, amount, recipient, tokenType);
  return result.signature;
}

/**
 * Estimate the cost savings from using ZK compression for an order
 *
 * @param encryptedPayloadSize - Size of the encrypted payload in bytes
 * @returns Cost comparison and savings
 */
export function estimateOrderCompressionSavings(encryptedPayloadSize: number): {
  uncompressedCost: bigint;
  compressedCost: bigint;
  savings: bigint;
  savingsPercent: number;
} {
  return estimateCompressionSavings(encryptedPayloadSize);
}

// Re-export ZK-related types and functions for convenience
export {
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  estimateCompressionSavings,
};

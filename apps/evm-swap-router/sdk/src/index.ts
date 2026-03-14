/**
 * @fabrknt/veil-evm-swap-router — EVM proof-of-concept for Veil's encrypted order flow
 *
 * Demonstrates that @fabrknt/veil-orders encryption is fully chain-agnostic by
 * providing an Ethereum-compatible contract + TypeScript SDK that uses
 * the exact same NaCl box encryption and commitment hash scheme as Solana.
 *
 * @example
 * ```typescript
 * import { createEvmEncryptedOrder, CONFIDENTIAL_SWAP_ROUTER_ABI } from '@fabrknt/veil-evm-swap-router';
 * import { ethers } from 'ethers';
 *
 * // Client-side encryption (no secret keys leave the browser)
 * const order = createEvmEncryptedOrder({
 *   minOutputAmount: '95000000',
 *   slippageBps: 50,
 *   deadline: Math.floor(Date.now() / 1000) + 300,
 *   solverPublicKey: '0xabcd...', // Solver's X25519 key in hex
 * });
 *
 * // Submit to EVM contract
 * const contract = new ethers.Contract(address, CONFIDENTIAL_SWAP_ROUTER_ABI, signer);
 * await contract.submitOrder(
 *   1n,
 *   inputTokenAddress,
 *   outputTokenAddress,
 *   ethers.parseUnits('100', 6),
 *   order.encryptedPayload,
 *   order.payloadHash,
 * );
 * ```
 */

import {
  createCommittedEncryptedOrder,
  generateEncryptionKeypair,
  encryptionKeyToHex,
  hexToEncryptionKey,
  type EncryptionKeypair,
  type EncryptedOrderWithCommitment,
} from '@fabrknt/veil-orders';

/**
 * Parameters for creating an EVM encrypted order
 */
export interface EvmOrderParams {
  minOutputAmount: string | number;
  slippageBps: number;
  deadline: number;
  solverPublicKey: string; // hex 0x-prefixed X25519 key
}

/**
 * Result of client-side order encryption
 */
export interface EvmEncryptedOrderResult extends EncryptedOrderWithCommitment {
  /** Hex-encoded payload hash for Solidity bytes32 */
  payloadHashHex: string;
  /** Hex-encoded encrypted payload for Solidity bytes */
  encryptedPayloadHex: string;
  /** User's ephemeral keypair (store securely — needed if solver needs user pubkey) */
  userKeypair: EncryptionKeypair;
}

/**
 * Create an encrypted order for EVM submission.
 * All encryption happens client-side — no secret keys leave the user's device.
 */
export function createEvmEncryptedOrder(params: EvmOrderParams): EvmEncryptedOrderResult {
  const userKeypair = generateEncryptionKeypair();
  const solverPubKeyBytes = hexToEncryptionKey(params.solverPublicKey);

  const committed = createCommittedEncryptedOrder(
    params.minOutputAmount,
    params.slippageBps,
    params.deadline,
    solverPubKeyBytes,
    userKeypair,
  );

  return {
    encryptedBytes: committed.encryptedBytes,
    payloadHash: committed.payloadHash,
    userPublicKey: committed.userPublicKey,
    payloadHashHex: '0x' + Buffer.from(committed.payloadHash).toString('hex'),
    encryptedPayloadHex: '0x' + Buffer.from(committed.encryptedBytes).toString('hex'),
    userKeypair,
  };
}

/**
 * ABI for the ConfidentialSwapRouter contract
 */
export const CONFIDENTIAL_SWAP_ROUTER_ABI = [
  'function initializeSolver(bytes32 encryptionPubKey, uint16 feeBps) external',
  'function submitOrder(uint64 orderId, address inputToken, address outputToken, uint256 inputAmount, bytes calldata encryptedPayload, bytes32 payloadHash) external',
  'function executeOrder(address owner, uint64 orderId, uint64 decryptedMinOutput, uint16 decryptedSlippageBps, int64 decryptedDeadline, uint256 actualOutputAmount) external',
  'function cancelOrder(uint64 orderId) external',
  'function claimOutput(uint64 orderId) external',
  'function getOrder(address owner, uint64 orderId) external view returns (tuple(address owner, uint64 orderId, address inputToken, address outputToken, uint256 inputAmount, uint256 minOutputAmount, uint256 outputAmount, bytes encryptedPayload, bytes32 payloadHash, uint8 status, uint64 createdAt, uint64 executedAt, address executedBy))',
  'function solverConfig() external view returns (tuple(address authority, bytes32 encryptionPubKey, uint16 feeBps, uint64 totalOrders, uint256 totalVolume, bool isActive))',
  'event SolverInitialized(address indexed authority, bytes32 encryptionPubKey, uint16 feeBps)',
  'event OrderSubmitted(bytes32 indexed orderKey, address indexed owner, uint64 orderId, uint256 inputAmount)',
  'event OrderExecuted(bytes32 indexed orderKey, address indexed solver, uint256 outputAmount)',
  'event OrderCancelled(bytes32 indexed orderKey, address indexed owner)',
] as const;

// Re-export utilities for EVM consumers
export { generateEncryptionKeypair, encryptionKeyToHex, hexToEncryptionKey } from '@fabrknt/veil-orders';

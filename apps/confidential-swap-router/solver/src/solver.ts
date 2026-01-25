import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AnchorProvider, Wallet, BN, Program, Idl } from '@coral-xyz/anchor';
import {
  SolverClient,
  OrderData,
  OrderStatus,
  EncryptionKeypair,
  generateEncryptionKeypair,
  PROGRAM_ID,
  SOLVER_CONFIG_SEED,
  ORDER_SEED,
  ConfidentialSwapClient,
} from '@confidential-swap/sdk';
import { JupiterClient, findOptimalRoute } from './jupiter';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// In-memory registry for user encryption pubkeys
// Key: user wallet address (base58), Value: encryption pubkey (Uint8Array)
export const userEncryptionPubkeyRegistry: Map<string, Uint8Array> = new Map();

/**
 * Solver configuration
 */
export interface SolverConfig {
  /** RPC endpoint */
  rpcUrl: string;
  /** Solver keypair */
  keypair: Keypair;
  /** Encryption keypair */
  encryptionKeypair: EncryptionKeypair;
  /** Polling interval in ms */
  pollIntervalMs: number;
  /** Maximum slippage to accept */
  maxSlippageBps: number;
  /** Minimum profit threshold (in output token smallest units) */
  minProfitThreshold: BN;
}

/**
 * Order execution result
 */
export interface ExecutionResult {
  orderId: BN;
  owner: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: BN;
  outputAmount: BN;
  profit: BN;
  jupiterSignature: string;
  executeSignature: string;
  success: boolean;
  error?: string;
}

/**
 * Confidential Swap Solver
 * Monitors pending orders, decrypts them, executes via Jupiter, and fills on-chain
 */
export class ConfidentialSwapSolver {
  private connection: Connection;
  private wallet: Wallet;
  private config: SolverConfig;
  private solverClient: SolverClient;
  private jupiterClient: JupiterClient;
  private isRunning: boolean = false;
  private processedOrders: Set<string> = new Set();

  constructor(config: SolverConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.wallet = new Wallet(config.keypair);
    this.solverClient = new SolverClient(
      this.connection,
      this.wallet,
      config.encryptionKeypair
    );
    this.jupiterClient = new JupiterClient(this.connection);
  }

  /**
   * Get the solver's encryption public key
   * Users need this to encrypt their orders
   */
  getEncryptionPublicKey(): Uint8Array {
    return this.config.encryptionKeypair.publicKey;
  }

  /**
   * Start the solver service
   */
  async start(): Promise<void> {
    console.log('Starting Confidential Swap Solver...');
    console.log(`Solver address: ${this.wallet.publicKey.toBase58()}`);
    console.log(`Encryption pubkey: ${Buffer.from(this.getEncryptionPublicKey()).toString('hex')}`);

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processPendingOrders();
      } catch (error) {
        console.error('Error processing orders:', error);
      }

      await this.sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * Stop the solver service
   */
  stop(): void {
    console.log('Stopping solver...');
    this.isRunning = false;
  }

  /**
   * Process all pending orders
   */
  private async processPendingOrders(): Promise<void> {
    // Fetch all pending orders from the program
    const pendingOrders = await this.fetchPendingOrders();

    for (const order of pendingOrders) {
      const orderKey = `${order.owner.toBase58()}-${order.orderId.toString()}`;

      // Skip already processed orders
      if (this.processedOrders.has(orderKey)) {
        continue;
      }

      try {
        const result = await this.executeOrder(order);
        this.processedOrders.add(orderKey);

        if (result.success) {
          console.log(`Order ${order.orderId.toString()} executed successfully`);
          console.log(`  Profit: ${result.profit.toString()}`);
        } else {
          console.log(`Order ${order.orderId.toString()} failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`Failed to execute order ${order.orderId.toString()}:`, error);
      }
    }
  }

  /**
   * Fetch all pending orders from the program using Anchor deserialization
   */
  private async fetchPendingOrders(): Promise<OrderData[]> {
    try {
      // Use SDK client to fetch pending orders with proper Anchor deserialization
      const swapClient = new ConfidentialSwapClient(this.connection, this.wallet);
      const pendingOrders = await swapClient.getPendingOrders();

      console.log(`Found ${pendingOrders.length} pending orders`);
      return pendingOrders;
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      return [];
    }
  }

  /**
   * Execute a single order
   */
  private async executeOrder(order: OrderData): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      orderId: order.orderId,
      owner: order.owner,
      inputMint: order.inputMint,
      outputMint: order.outputMint,
      inputAmount: order.inputAmount,
      outputAmount: new BN(0),
      profit: new BN(0),
      jupiterSignature: '',
      executeSignature: '',
      success: false,
    };

    try {
      // Step 1: Decrypt the order payload
      // NOTE: We need the user's encryption public key, which should be stored somewhere
      // For now, we'll assume it's derivable from the order or stored off-chain
      const userEncryptionPubkey = await this.getUserEncryptionPubkey(order.owner);

      const decryptedPayload = this.solverClient.decryptOrderPayload(
        order.encryptedPayload,
        userEncryptionPubkey
      );

      // Step 2: Check if order is still valid (not expired)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > decryptedPayload.deadline) {
        result.error = 'Order expired';
        return result;
      }

      // Step 3: Find optimal route via Jupiter
      const route = await findOptimalRoute(
        this.jupiterClient,
        order.inputMint,
        order.outputMint,
        order.inputAmount,
        decryptedPayload.minOutputAmount,
        decryptedPayload.slippageBps
      );

      if (!route.isViable) {
        result.error = 'No viable route found';
        return result;
      }

      // Step 4: Check profitability
      if (route.expectedProfit.lt(this.config.minProfitThreshold)) {
        result.error = 'Insufficient profit';
        return result;
      }

      // Step 5: Execute swap via Jupiter
      const swapResult = await this.jupiterClient.executeSwap(
        order.inputMint,
        order.outputMint,
        order.inputAmount,
        decryptedPayload.slippageBps,
        this.wallet
      );

      result.jupiterSignature = swapResult.signature;
      result.outputAmount = swapResult.outputAmount;

      // Step 6: Execute on-chain order
      const executeSignature = await this.solverClient.executeOrder(
        order.owner,
        order.orderId,
        order.inputMint,
        order.outputMint,
        decryptedPayload.minOutputAmount,
        swapResult.outputAmount
      );

      result.executeSignature = executeSignature;
      result.profit = swapResult.outputAmount.sub(decryptedPayload.minOutputAmount);
      result.success = true;

      return result;
    } catch (error: any) {
      result.error = error.message;
      return result;
    }
  }

  /**
   * Get user's encryption public key from in-memory registry
   * Users must register their encryption pubkey via the API before submitting orders
   */
  private async getUserEncryptionPubkey(userAddress: PublicKey): Promise<Uint8Array> {
    const userAddressStr = userAddress.toBase58();
    const encryptionPubkey = userEncryptionPubkeyRegistry.get(userAddressStr);

    if (!encryptionPubkey) {
      throw new Error(`User encryption pubkey not found for ${userAddressStr}. User must register via /api/register-encryption-pubkey`);
    }

    return encryptionPubkey;
  }

  /**
   * Register a user's encryption public key (called from API)
   */
  static registerUserEncryptionPubkey(userAddress: string, encryptionPubkey: Uint8Array): void {
    userEncryptionPubkeyRegistry.set(userAddress, encryptionPubkey);
    console.log(`Registered encryption pubkey for user: ${userAddress}`);
  }

  /**
   * Get the count of registered users
   */
  static getRegisteredUserCount(): number {
    return userEncryptionPubkeyRegistry.size;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create solver configuration from environment
 */
export function createSolverConfig(): SolverConfig {
  const keypairPath = process.env.SOLVER_KEYPAIR_PATH;
  if (!keypairPath) {
    throw new Error('SOLVER_KEYPAIR_PATH environment variable required');
  }

  const keypairJson = require(keypairPath);
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairJson));

  // Generate or load encryption keypair
  // In production, this should be persisted
  const encryptionKeypair = generateEncryptionKeypair();

  return {
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    keypair,
    encryptionKeypair,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000'),
    maxSlippageBps: parseInt(process.env.MAX_SLIPPAGE_BPS || '100'),
    minProfitThreshold: new BN(process.env.MIN_PROFIT_THRESHOLD || '0'),
  };
}

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';

import {
  TieredSolverClient,
  TieredOrderData,
  OrderStatus,
} from '@umbra/sdk';
import {
  FairScoreClient,
  TierCalculator,
} from '@umbra/fairscore-middleware';
import {
  EncryptionKeypair,
  generateEncryptionKeypair,
} from '@privacy-suite/crypto';

import { JupiterClient } from './jupiter';

export interface SolverConfig {
  rpcUrl: string;
  keypairPath: string;
  fairScoreApiKey: string;
  pollIntervalMs: number;
  maxSlippageBps?: number;
  minProfitThreshold?: number;
}

interface ProcessedOrder {
  orderId: string;
  timestamp: number;
  status: 'success' | 'failed';
  error?: string;
}

export class UmbraSolver {
  private config: SolverConfig;
  private connection: Connection;
  private keypair: Keypair;
  private encryptionKeypair: EncryptionKeypair;
  private solverClient: TieredSolverClient;
  private fairScoreClient: FairScoreClient;
  private jupiterClient: JupiterClient;
  private isRunning: boolean = false;
  private processedOrders: Map<string, ProcessedOrder> = new Map();

  constructor(config: SolverConfig) {
    this.config = {
      maxSlippageBps: 100, // 1% default
      minProfitThreshold: 0,
      ...config,
    };

    // Initialize connection
    this.connection = new Connection(config.rpcUrl, 'confirmed');

    // Load keypair
    const keypairPath = config.keypairPath.replace('~', process.env.HOME || '');
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    this.keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Generate encryption keypair for order decryption
    this.encryptionKeypair = generateEncryptionKeypair();

    // Initialize clients
    const wallet = new Wallet(this.keypair);
    this.solverClient = new TieredSolverClient(
      this.connection,
      wallet,
      this.encryptionKeypair
    );

    this.fairScoreClient = new FairScoreClient({
      apiKey: config.fairScoreApiKey,
    });

    this.jupiterClient = new JupiterClient(this.connection);

    console.log('Solver initialized:');
    console.log(`  Address: ${this.keypair.publicKey.toString()}`);
    console.log(`  Encryption pubkey: ${Buffer.from(this.encryptionKeypair.publicKey).toString('hex').slice(0, 16)}...`);
  }

  /**
   * Get solver's encryption public key
   */
  getEncryptionPublicKey(): Uint8Array {
    return this.encryptionKeypair.publicKey;
  }

  /**
   * Start the solver
   */
  async start(): Promise<void> {
    this.isRunning = true;
    console.log('Solver started, polling for orders...');

    while (this.isRunning) {
      try {
        await this.processOrders();
      } catch (error) {
        console.error('Error processing orders:', error);
      }

      await this.sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * Stop the solver
   */
  stop(): void {
    this.isRunning = false;
    console.log('Solver stopped');
  }

  /**
   * Process pending orders
   */
  private async processOrders(): Promise<void> {
    // This would fetch pending orders from the program
    // For now, we'll implement the core logic

    // In production, this would be:
    // const pendingOrders = await this.getPendingOrders();
    // for (const order of pendingOrders) {
    //   await this.processOrder(order);
    // }

    console.log('Checking for pending orders...');
  }

  /**
   * Process a single order
   */
  async processOrder(order: TieredOrderData): Promise<void> {
    const orderKey = `${order.owner.toString()}-${order.orderId.toString()}`;

    // Skip if already processed
    if (this.processedOrders.has(orderKey)) {
      return;
    }

    try {
      console.log(`Processing order ${order.orderId.toString()}:`);
      console.log(`  Owner: ${order.owner.toString()}`);
      console.log(`  Tier: ${order.userTier} (FairScore: ${order.fairscoreAtCreation})`);
      console.log(`  Fee: ${order.feeBpsApplied} bps`);
      console.log(`  MEV Protection: ${order.mevProtectionLevel}`);

      // Decrypt order payload
      const decrypted = this.solverClient.decryptOrder(
        order.encryptedPayload,
        order.userEncryptionPubkey
      );

      console.log(`  Min output: ${decrypted.minOutputAmount.toString()}`);
      console.log(`  Slippage: ${decrypted.slippageBps} bps`);
      console.log(`  Deadline: ${new Date(decrypted.deadline * 1000).toISOString()}`);

      // Check deadline
      if (Date.now() / 1000 > decrypted.deadline) {
        console.log('  Order expired, skipping');
        this.markProcessed(orderKey, 'failed', 'Order expired');
        return;
      }

      // Get quote from Jupiter
      const quote = await this.jupiterClient.getQuote(
        order.inputMint,
        order.outputMint,
        order.inputAmount,
        decrypted.slippageBps
      );

      // Check profitability
      const profitCheck = this.jupiterClient.checkProfitability(
        quote,
        decrypted.minOutputAmount,
        this.config.maxSlippageBps!
      );

      if (!profitCheck.isProfitable) {
        console.log('  Order not profitable, skipping');
        this.markProcessed(orderKey, 'failed', 'Not profitable');
        return;
      }

      console.log(`  Quote output: ${profitCheck.outputAmount.toString()}`);

      // Execute the swap via Jupiter first
      // const swapResult = await this.jupiterClient.executeSwap(...);

      // Then execute on-chain order completion
      // For now, we'll just mark as processed
      console.log('  Would execute order here');

      this.markProcessed(orderKey, 'success');

    } catch (error: any) {
      console.error(`  Error processing order: ${error.message}`);
      this.markProcessed(orderKey, 'failed', error.message);
    }
  }

  private markProcessed(orderKey: string, status: 'success' | 'failed', error?: string): void {
    this.processedOrders.set(orderKey, {
      orderId: orderKey,
      timestamp: Date.now(),
      status,
      error,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get solver stats
   */
  getStats(): {
    address: string;
    encryptionPubkey: string;
    isRunning: boolean;
    processedCount: number;
    successCount: number;
    failedCount: number;
  } {
    let successCount = 0;
    let failedCount = 0;

    this.processedOrders.forEach(order => {
      if (order.status === 'success') successCount++;
      else failedCount++;
    });

    return {
      address: this.keypair.publicKey.toString(),
      encryptionPubkey: Buffer.from(this.encryptionKeypair.publicKey).toString('hex'),
      isRunning: this.isRunning,
      processedCount: this.processedOrders.size,
      successCount,
      failedCount,
    };
  }
}

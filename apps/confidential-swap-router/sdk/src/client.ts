import { Program, AnchorProvider, BN, web3, Idl } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  Connection,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  EncryptionKeypair,
  createEncryptedOrder,
  decryptOrderPayload,
  deriveEncryptionKeypair,
  generateEncryptionKeypair,
} from './encryption';
import { IDL } from './idl';

// Use Idl type for Program to avoid type compatibility issues with Anchor 0.30+
type AnyProgram = Program<Idl>;

// Program ID (must match IDL address)
export const PROGRAM_ID = new PublicKey('v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM');

// Seeds
export const SOLVER_CONFIG_SEED = Buffer.from('solver_config');
export const ORDER_SEED = Buffer.from('encrypted_order');
export const ORDER_VAULT_SEED = Buffer.from('order_vault');
export const OUTPUT_VAULT_SEED = Buffer.from('output_vault');

/**
 * Order status enum matching the on-chain type
 */
export enum OrderStatus {
  Pending = 'pending',
  Executing = 'executing',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

/**
 * Order data from on-chain
 */
export interface OrderData {
  owner: PublicKey;
  orderId: BN;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmount: BN;
  minOutputAmount: BN;
  outputAmount: BN;
  encryptedPayload: Uint8Array;
  status: OrderStatus;
  createdAt: BN;
  executedAt: BN;
  executedBy: PublicKey | null;
  executionSignature: Uint8Array;
  bump: number;
}

/**
 * Solver config data from on-chain
 */
export interface SolverConfigData {
  authority: PublicKey;
  solverPubkey: PublicKey;
  feeBps: number;
  totalOrders: BN;
  totalVolume: BN;
  isActive: boolean;
  bump: number;
}

/**
 * Confidential Swap Router SDK Client
 */
export class ConfidentialSwapClient {
  private program: AnyProgram;
  private provider: AnchorProvider;
  private encryptionKeypair: EncryptionKeypair | null = null;

  constructor(connection: Connection, wallet: any) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(IDL as unknown as Idl, this.provider);
  }

  /**
   * Initialize encryption keypair from wallet
   */
  initializeEncryption(walletSecretKey: Uint8Array): void {
    this.encryptionKeypair = deriveEncryptionKeypair(walletSecretKey);
  }

  /**
   * Set a custom encryption keypair
   */
  setEncryptionKeypair(keypair: EncryptionKeypair): void {
    this.encryptionKeypair = keypair;
  }

  /**
   * Get the user's encryption public key
   */
  getEncryptionPublicKey(): Uint8Array {
    if (!this.encryptionKeypair) {
      throw new Error('Encryption not initialized');
    }
    return this.encryptionKeypair.publicKey;
  }

  // ============ PDA Derivations ============

  /**
   * Derive solver config PDA
   */
  getSolverConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SOLVER_CONFIG_SEED],
      PROGRAM_ID
    );
  }

  /**
   * Derive order PDA
   */
  getOrderPda(owner: PublicKey, orderId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ORDER_SEED, owner.toBuffer(), orderId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  /**
   * Derive order vault PDA
   */
  getOrderVaultPda(orderPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ORDER_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );
  }

  /**
   * Derive output vault PDA
   */
  getOutputVaultPda(orderPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [OUTPUT_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );
  }

  // ============ Read Operations ============

  /**
   * Fetch solver config
   */
  async getSolverConfig(): Promise<SolverConfigData | null> {
    try {
      const [pda] = this.getSolverConfigPda();
      const account = await (this.program.account as any).solverConfig.fetch(pda);
      return account as unknown as SolverConfigData;
    } catch {
      return null;
    }
  }

  /**
   * Fetch order by owner and orderId
   */
  async getOrder(owner: PublicKey, orderId: BN): Promise<OrderData | null> {
    try {
      const [pda] = this.getOrderPda(owner, orderId);
      const account = await (this.program.account as any).encryptedOrder.fetch(pda);
      return this.parseOrderAccount(account);
    } catch {
      return null;
    }
  }

  /**
   * Fetch all orders for an owner
   */
  async getOrdersByOwner(owner: PublicKey): Promise<OrderData[]> {
    const accounts = await (this.program.account as any).encryptedOrder.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);
    return accounts.map((a: { account: any }) => this.parseOrderAccount(a.account));
  }

  /**
   * Fetch all pending orders
   */
  async getPendingOrders(): Promise<OrderData[]> {
    const accounts = await (this.program.account as any).encryptedOrder.all();
    return accounts
      .map((a: { account: any }) => this.parseOrderAccount(a.account))
      .filter((o: OrderData) => o.status === OrderStatus.Pending);
  }

  private parseOrderAccount(account: any): OrderData {
    const statusKey = Object.keys(account.status)[0];
    return {
      owner: account.owner,
      orderId: account.orderId,
      inputMint: account.inputMint,
      outputMint: account.outputMint,
      inputAmount: account.inputAmount,
      minOutputAmount: account.minOutputAmount,
      outputAmount: account.outputAmount,
      encryptedPayload: new Uint8Array(account.encryptedPayload),
      status: statusKey as OrderStatus,
      createdAt: account.createdAt,
      executedAt: account.executedAt,
      executedBy: account.executedBy,
      executionSignature: new Uint8Array(account.executionSignature),
      bump: account.bump,
    };
  }

  // ============ Write Operations ============

  /**
   * Initialize solver (admin only)
   */
  async initializeSolver(
    solverPubkey: PublicKey,
    feeBps: number
  ): Promise<string> {
    const [solverConfigPda] = this.getSolverConfigPda();

    const tx = await this.program.methods
      .initializeSolver(solverPubkey, feeBps)
      .accounts({
        authority: this.provider.wallet.publicKey,
        solverConfig: solverConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Submit a new encrypted order
   */
  async submitOrder(
    orderId: BN,
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: BN,
    minOutputAmount: BN,
    slippageBps: number,
    deadlineSeconds: number,
    solverEncryptionPubkey: Uint8Array
  ): Promise<string> {
    if (!this.encryptionKeypair) {
      throw new Error('Encryption not initialized');
    }

    // Create encrypted payload
    const encryptedPayload = createEncryptedOrder(
      minOutputAmount,
      slippageBps,
      deadlineSeconds,
      solverEncryptionPubkey,
      this.encryptionKeypair
    );

    const owner = this.provider.wallet.publicKey;
    const [solverConfigPda] = this.getSolverConfigPda();
    const [orderPda] = this.getOrderPda(owner, orderId);
    const [orderVaultPda] = this.getOrderVaultPda(orderPda);

    const userInputToken = await getAssociatedTokenAddress(inputMint, owner);

    const tx = await this.program.methods
      .submitOrder(orderId, inputAmount, Buffer.from(encryptedPayload))
      .accounts({
        owner,
        solverConfig: solverConfigPda,
        order: orderPda,
        inputMint,
        outputMint,
        userInputToken,
        orderVault: orderVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Cancel an order (order owner only)
   */
  async cancelOrder(orderId: BN, inputMint: PublicKey): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [orderPda] = this.getOrderPda(owner, orderId);
    const [orderVaultPda] = this.getOrderVaultPda(orderPda);

    const userInputToken = await getAssociatedTokenAddress(inputMint, owner);

    const tx = await this.program.methods
      .cancelOrder()
      .accounts({
        owner,
        order: orderPda,
        inputMint,
        orderVault: orderVaultPda,
        userInputToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim output after order execution (order owner only)
   */
  async claimOutput(orderId: BN, outputMint: PublicKey): Promise<string> {
    const owner = this.provider.wallet.publicKey;
    const [orderPda] = this.getOrderPda(owner, orderId);
    const [outputVaultPda] = this.getOutputVaultPda(orderPda);

    const userOutputToken = await getAssociatedTokenAddress(outputMint, owner);

    // Check if ATA exists
    const ataInfo = await this.provider.connection.getAccountInfo(userOutputToken);

    const tx = this.program.methods.claimOutput().accounts({
      owner,
      order: orderPda,
      outputMint,
      outputVault: outputVaultPda,
      userOutputToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });

    // Add create ATA instruction if needed
    if (!ataInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        owner,
        userOutputToken,
        owner,
        outputMint
      );
      return await tx.preInstructions([createAtaIx]).rpc();
    }

    return await tx.rpc();
  }
}

/**
 * Solver client for executing orders
 */
export class SolverClient {
  private program: AnyProgram;
  private provider: AnchorProvider;
  private encryptionKeypair: EncryptionKeypair;

  constructor(
    connection: Connection,
    wallet: any,
    encryptionKeypair: EncryptionKeypair
  ) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(IDL as unknown as Idl, this.provider);
    this.encryptionKeypair = encryptionKeypair;
  }

  /**
   * Decrypt order payload to get execution parameters
   */
  decryptOrderPayload(encryptedPayload: Uint8Array, userEncryptionPubkey: Uint8Array) {
    return decryptOrderPayload(
      encryptedPayload,
      userEncryptionPubkey,
      this.encryptionKeypair
    );
  }

  /**
   * Execute an order
   */
  async executeOrder(
    orderOwner: PublicKey,
    orderId: BN,
    inputMint: PublicKey,
    outputMint: PublicKey,
    decryptedMinOutput: BN,
    actualOutputAmount: BN
  ): Promise<string> {
    const solver = this.provider.wallet.publicKey;
    const [solverConfigPda] = PublicKey.findProgramAddressSync(
      [SOLVER_CONFIG_SEED],
      PROGRAM_ID
    );
    const [orderPda] = PublicKey.findProgramAddressSync(
      [ORDER_SEED, orderOwner.toBuffer(), orderId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
    const [orderVaultPda] = PublicKey.findProgramAddressSync(
      [ORDER_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );
    const [outputVaultPda] = PublicKey.findProgramAddressSync(
      [OUTPUT_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );

    const solverInputToken = await getAssociatedTokenAddress(inputMint, solver);
    const solverOutputToken = await getAssociatedTokenAddress(outputMint, solver);

    const tx = await this.program.methods
      .executeOrder(decryptedMinOutput, actualOutputAmount)
      .accounts({
        solver,
        solverConfig: solverConfigPda,
        order: orderPda,
        inputMint,
        outputMint,
        orderVault: orderVaultPda,
        outputVault: outputVaultPda,
        solverInputToken,
        solverOutputToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }
}

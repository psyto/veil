import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import {
  PublicKey,
  Connection,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  FairScoreClient,
  TierCalculator,
  FairScoreConfig,
} from '@umbra/fairscore-middleware';
import {
  EncryptionKeypair,
  deriveEncryptionKeypair,
  generateEncryptionKeypair,
} from '@privacy-suite/crypto';

import {
  PROGRAM_ID,
  TIER_CONFIG_SEED,
  ORDER_SEED,
  ORDER_VAULT_SEED,
  OUTPUT_VAULT_SEED,
  ORDER_TYPE_MARKET,
} from './constants';
import {
  TierConfigData,
  TieredOrderData,
  OrderStatus,
  OrderType,
  MevProtectionLevel,
  SubmitOrderParams,
  UserTierInfo,
} from './types';
import { createEncryptedOrder, decryptOrderPayload } from './encryption';

// Placeholder IDL - replace with generated IDL after anchor build
const IDL = {
  address: PROGRAM_ID.toString(),
  metadata: {
    name: 'umbra_swap',
    version: '0.1.0',
    spec: '0.1.0',
  },
  instructions: [],
  accounts: [],
  types: [],
} as Idl;

type AnyProgram = Program<Idl>;

/**
 * Umbra Client - Tier-aware swap client
 */
export class UmbraClient {
  private program: AnyProgram;
  private provider: AnchorProvider;
  private fairScoreClient: FairScoreClient;
  private encryptionKeypair: EncryptionKeypair | null = null;

  constructor(
    connection: Connection,
    wallet: any,
    fairScoreConfig: FairScoreConfig
  ) {
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new Program(IDL, this.provider);
    this.fairScoreClient = new FairScoreClient(fairScoreConfig);
  }

  /**
   * Initialize encryption from wallet secret key
   */
  initializeEncryption(walletSecretKey: Uint8Array): void {
    this.encryptionKeypair = deriveEncryptionKeypair(walletSecretKey);
  }

  /**
   * Set custom encryption keypair
   */
  setEncryptionKeypair(keypair: EncryptionKeypair): void {
    this.encryptionKeypair = keypair;
  }

  /**
   * Get user's encryption public key
   */
  getEncryptionPublicKey(): Uint8Array {
    if (!this.encryptionKeypair) {
      throw new Error('Encryption not initialized');
    }
    return this.encryptionKeypair.publicKey;
  }

  // ============ PDA Derivations ============

  getTierConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [TIER_CONFIG_SEED],
      PROGRAM_ID
    );
  }

  getOrderPda(owner: PublicKey, orderId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ORDER_SEED, owner.toBuffer(), orderId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  getOrderVaultPda(orderPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ORDER_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );
  }

  getOutputVaultPda(orderPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [OUTPUT_VAULT_SEED, orderPda.toBuffer()],
      PROGRAM_ID
    );
  }

  // ============ FairScore Integration ============

  /**
   * Get user's tier information
   */
  async getUserTierInfo(wallet?: PublicKey): Promise<UserTierInfo> {
    const userWallet = wallet || this.provider.wallet.publicKey;
    const fairScore = await this.fairScoreClient.getFairScore(userWallet);
    const benefits = TierCalculator.getBenefitsFromScore(fairScore.score);

    return {
      fairscore: fairScore.score,
      tier: fairScore.tier,
      tierName: benefits.tierName,
      feeBps: benefits.feeBps,
      mevProtection: this.mapMevProtection(benefits.mevProtection),
      allowedOrderTypes: benefits.orderTypes.map(t => t as unknown as OrderType),
      hasDerivativesAccess: benefits.derivativesAccess.length > 0,
    };
  }

  /**
   * Get fee for current user
   */
  async getUserFeeBps(wallet?: PublicKey): Promise<number> {
    const userWallet = wallet || this.provider.wallet.publicKey;
    return this.fairScoreClient.getFeeBps(userWallet);
  }

  private mapMevProtection(level: number): MevProtectionLevel {
    switch (level) {
      case 0: return MevProtectionLevel.None;
      case 1: return MevProtectionLevel.Basic;
      case 2: return MevProtectionLevel.Full;
      case 3: return MevProtectionLevel.Priority;
      default: return MevProtectionLevel.None;
    }
  }

  // ============ Read Operations ============

  /**
   * Fetch tier config
   */
  async getTierConfig(): Promise<TierConfigData | null> {
    try {
      const [pda] = this.getTierConfigPda();
      const account = await (this.program.account as any).tierConfig.fetch(pda);
      return this.parseTierConfig(account);
    } catch {
      return null;
    }
  }

  /**
   * Fetch order by owner and orderId
   */
  async getOrder(owner: PublicKey, orderId: BN): Promise<TieredOrderData | null> {
    try {
      const [pda] = this.getOrderPda(owner, orderId);
      const account = await (this.program.account as any).tieredOrder.fetch(pda);
      return this.parseOrderAccount(account);
    } catch {
      return null;
    }
  }

  /**
   * Fetch all orders for owner
   */
  async getOrdersByOwner(owner: PublicKey): Promise<TieredOrderData[]> {
    const accounts = await (this.program.account as any).tieredOrder.all([
      {
        memcmp: {
          offset: 8,
          bytes: owner.toBase58(),
        },
      },
    ]);
    return accounts.map((a: { account: any }) => this.parseOrderAccount(a.account));
  }

  /**
   * Fetch all pending orders
   */
  async getPendingOrders(): Promise<TieredOrderData[]> {
    const accounts = await (this.program.account as any).tieredOrder.all();
    return accounts
      .map((a: { account: any }) => this.parseOrderAccount(a.account))
      .filter((o: TieredOrderData) => o.status === OrderStatus.Pending);
  }

  private parseTierConfig(account: any): TierConfigData {
    return {
      authority: account.authority,
      solverPubkey: account.solverPubkey,
      tiers: account.tiers.map((t: any) => ({
        minFairscore: t.minFairscore,
        feeBps: t.feeBps,
        mevProtectionLevel: this.parseMevLevel(t.mevProtectionLevel),
        allowedOrderTypes: t.allowedOrderTypes,
        derivativesAccess: t.derivativesAccess,
      })),
      feeVault: account.feeVault,
      totalVolumeByTier: account.totalVolumeByTier,
      totalFeesCollected: account.totalFeesCollected,
      totalOrders: account.totalOrders,
      isActive: account.isActive,
      bump: account.bump,
    };
  }

  private parseOrderAccount(account: any): TieredOrderData {
    const statusKey = Object.keys(account.status)[0];
    const orderTypeKey = Object.keys(account.orderType)[0];

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
      orderType: orderTypeKey as OrderType,
      createdAt: account.createdAt,
      executedAt: account.executedAt,
      executedBy: account.executedBy,
      userTier: account.userTier,
      feeBpsApplied: account.feeBpsApplied,
      feeAmount: account.feeAmount,
      mevProtectionLevel: this.parseMevLevel(account.mevProtectionLevel),
      fairscoreAtCreation: account.fairscoreAtCreation,
      userEncryptionPubkey: new Uint8Array(account.userEncryptionPubkey),
      bump: account.bump,
    };
  }

  private parseMevLevel(level: any): MevProtectionLevel {
    const key = Object.keys(level)[0];
    return key as MevProtectionLevel;
  }

  // ============ Write Operations ============

  /**
   * Submit a tiered order
   */
  async submitOrder(params: SubmitOrderParams): Promise<string> {
    if (!this.encryptionKeypair) {
      throw new Error('Encryption not initialized');
    }

    const owner = this.provider.wallet.publicKey;

    // Get FairScore and create proof
    const fairScore = await this.fairScoreClient.getFairScore(owner);
    const proof = await this.fairScoreClient.createProof(owner);

    // Get tier config to get solver's encryption pubkey
    const tierConfig = await this.getTierConfig();
    if (!tierConfig) {
      throw new Error('Tier config not initialized');
    }

    // Create encrypted payload
    const deadline = Math.floor(Date.now() / 1000) + params.deadlineSeconds;
    const encryptedPayload = createEncryptedOrder(
      params.minOutputAmount,
      params.slippageBps,
      deadline,
      tierConfig.solverPubkey.toBytes(),
      this.encryptionKeypair
    );

    // Map order type to bitmask
    const orderTypeBitmask = this.orderTypeToBitmask(params.orderType || OrderType.Market);

    const [tierConfigPda] = this.getTierConfigPda();
    const [orderPda] = this.getOrderPda(owner, params.orderId);
    const [orderVaultPda] = this.getOrderVaultPda(orderPda);

    const userInputToken = await getAssociatedTokenAddress(params.inputMint, owner);

    const tx = await this.program.methods
      .submitOrder(
        params.orderId,
        params.inputAmount,
        orderTypeBitmask,
        Buffer.from(encryptedPayload),
        Buffer.from(this.encryptionKeypair.publicKey),
        fairScore.score,
        proof.timestamp,
        Array.from(proof.signature)
      )
      .accounts({
        owner,
        tierConfig: tierConfigPda,
        order: orderPda,
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        userInputToken,
        orderVault: orderVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Cancel an order
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
   * Claim output after execution
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

  private orderTypeToBitmask(orderType: OrderType): number {
    switch (orderType) {
      case OrderType.Market: return 1;
      case OrderType.Limit: return 2;
      case OrderType.Twap: return 4;
      case OrderType.Iceberg: return 8;
      case OrderType.Dark: return 16;
      default: return 1;
    }
  }
}

/**
 * Tiered Solver Client - For executing orders
 */
export class TieredSolverClient {
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
    this.program = new Program(IDL, this.provider);
    this.encryptionKeypair = encryptionKeypair;
  }

  /**
   * Get solver's encryption public key
   */
  getEncryptionPublicKey(): Uint8Array {
    return this.encryptionKeypair.publicKey;
  }

  /**
   * Decrypt order payload
   */
  decryptOrder(encryptedPayload: Uint8Array, userEncryptionPubkey: Uint8Array) {
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
    actualOutputAmount: BN,
    feeVault: PublicKey
  ): Promise<string> {
    const solver = this.provider.wallet.publicKey;

    const [tierConfigPda] = PublicKey.findProgramAddressSync(
      [TIER_CONFIG_SEED],
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
        tierConfig: tierConfigPda,
        order: orderPda,
        inputMint,
        outputMint,
        orderVault: orderVaultPda,
        outputVault: outputVaultPda,
        solverInputToken,
        solverOutputToken,
        feeVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }
}

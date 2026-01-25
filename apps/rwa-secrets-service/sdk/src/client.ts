import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  EncryptionKeypair,
  generateEncryptionKeypair,
  encryptAssetMetadata,
  decryptAssetMetadata,
  createKeyShareForGrantee,
  RwaAssetMetadata,
  generateAssetId,
} from './encryption';
import { IDL } from './idl';

// Use Idl type for Program to avoid type compatibility issues with Anchor 0.30+
type AnyProgram = Program<Idl>;

// Program ID - update after deployment
export const RWA_SECRETS_PROGRAM_ID = new PublicKey(
  'RWAsec1111111111111111111111111111111111111'
);

/**
 * Access levels for RWA assets
 */
export enum AccessLevel {
  ViewBasic = 0,
  ViewFull = 1,
  Auditor = 2,
  Admin = 3,
}

/**
 * Asset types for RWA
 */
export enum AssetType {
  RealEstate = 0,
  Securities = 1,
  Commodities = 2,
  Receivables = 3,
  IntellectualProperty = 4,
  Equipment = 5,
  Other = 6,
}

/**
 * Access types for audit logging
 */
export enum AccessType {
  ViewBasic = 0,
  ViewFull = 1,
  Audit = 2,
  TransferRequest = 3,
  Download = 4,
}

/**
 * Asset data from on-chain
 */
export interface AssetData {
  issuer: PublicKey;
  assetId: Uint8Array;
  assetType: number;
  encryptedMetadata: Uint8Array;
  issuerEncryptionPubkey: Uint8Array;
  status: 'active' | 'inactive' | 'frozen' | 'transferred';
  createdAt: BN;
  updatedAt: BN;
  accessGrantCount: number;
  bump: number;
  pda: PublicKey;
}

/**
 * Access grant data from on-chain
 */
export interface AccessGrantData {
  asset: PublicKey;
  grantee: PublicKey;
  grantor: PublicKey;
  accessLevel: number;
  encryptedKeyShare: Uint8Array;
  grantedAt: BN;
  expiresAt: BN;
  canDelegate: boolean;
  isRevoked: boolean;
  revokedAt: BN;
  bump: number;
  pda: PublicKey;
}

/**
 * RWA Secrets Service client for interacting with the on-chain program
 */
export class RwaSecretsClient {
  private connection: Connection;
  private programId: PublicKey;
  private program: AnyProgram | null = null;
  private provider: AnchorProvider | null = null;

  constructor(connection: Connection, programId: PublicKey = RWA_SECRETS_PROGRAM_ID, wallet?: any) {
    this.connection = connection;
    this.programId = programId;

    if (wallet) {
      this.provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
      this.program = new Program(IDL as unknown as Idl, this.provider);
    }
  }

  /**
   * Set wallet for write operations
   */
  setWallet(wallet: any): void {
    this.provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });
    this.program = new Program(IDL as unknown as Idl, this.provider);
  }

  /**
   * Get the protocol config PDA
   */
  getProtocolConfigPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('protocol_config')],
      this.programId
    );
  }

  /**
   * Get the asset PDA for a given asset ID
   */
  getAssetPda(assetId: Uint8Array): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('rwa_asset'), Buffer.from(assetId)],
      this.programId
    );
  }

  /**
   * Get the access grant PDA
   */
  getAccessGrantPda(assetPubkey: PublicKey, grantee: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('access_grant'), assetPubkey.toBuffer(), grantee.toBuffer()],
      this.programId
    );
  }

  /**
   * Get audit log PDA
   */
  getAuditLogPda(assetPubkey: PublicKey, timestamp: number): [PublicKey, number] {
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(timestamp));
    return PublicKey.findProgramAddressSync(
      [Buffer.from('audit_log'), assetPubkey.toBuffer(), timestampBuffer],
      this.programId
    );
  }

  /**
   * Create instruction to initialize the protocol
   */
  createInitializeProtocolInstruction(
    authority: PublicKey,
    admin: PublicKey
  ): TransactionInstruction {
    const [protocolConfig] = this.getProtocolConfigPda();

    // Manual instruction creation since we don't have IDL
    const data = Buffer.alloc(40);
    // Discriminator for initialize_protocol (first 8 bytes)
    data.write('initialize_protocol'.slice(0, 8), 0);
    // Admin pubkey
    admin.toBuffer().copy(data, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: protocolConfig, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  /**
   * Register a new RWA asset with encrypted metadata
   */
  async registerAsset(
    issuer: Keypair,
    offChainAssetId: string,
    assetType: AssetType,
    metadata: RwaAssetMetadata,
    issuerEncryptionKeypair: EncryptionKeypair
  ): Promise<{
    assetId: Uint8Array;
    assetPda: PublicKey;
    encryptedMetadata: Uint8Array;
  }> {
    const assetId = await generateAssetId(offChainAssetId);
    const [assetPda] = this.getAssetPda(assetId);
    const [protocolConfig] = this.getProtocolConfigPda();

    const encryptedMetadata = encryptAssetMetadata(metadata, issuerEncryptionKeypair);

    // Build and send transaction
    // (Implementation depends on whether using Anchor or raw transactions)

    return {
      assetId,
      assetPda,
      encryptedMetadata: encryptedMetadata.bytes,
    };
  }

  /**
   * Grant access to an asset for a specific party
   */
  async grantAccess(
    grantor: Keypair,
    assetPda: PublicKey,
    grantee: PublicKey,
    accessLevel: AccessLevel,
    issuerEncryptionKeypair: EncryptionKeypair,
    granteePublicKey: Uint8Array,
    expiresAt: number = 0,
    canDelegate: boolean = false
  ): Promise<{
    accessGrantPda: PublicKey;
    encryptedKeyShare: Uint8Array;
  }> {
    const [accessGrantPda] = this.getAccessGrantPda(assetPda, grantee);

    // Create encrypted key share for grantee
    const encryptedKeyShare = createKeyShareForGrantee(
      issuerEncryptionKeypair,
      granteePublicKey
    );

    return {
      accessGrantPda,
      encryptedKeyShare,
    };
  }

  /**
   * Fetch and decrypt asset metadata (if user has access)
   */
  async fetchAssetMetadata(
    assetPda: PublicKey,
    decryptorKeypair: EncryptionKeypair,
    issuerPublicKey: Uint8Array
  ): Promise<RwaAssetMetadata | null> {
    const accountInfo = await this.connection.getAccountInfo(assetPda);
    if (!accountInfo) {
      return null;
    }

    // Parse account data (skip 8-byte discriminator)
    const data = accountInfo.data.slice(8);

    // Extract encrypted metadata from account
    // Layout: issuer(32) + asset_id(32) + asset_type(1) + metadata_len(4) + metadata(var) + ...
    const metadataLenOffset = 32 + 32 + 1;
    const metadataLen = data.readUInt32LE(metadataLenOffset);
    const encryptedMetadata = data.slice(
      metadataLenOffset + 4,
      metadataLenOffset + 4 + metadataLen
    );

    try {
      return decryptAssetMetadata(encryptedMetadata, issuerPublicKey, decryptorKeypair);
    } catch {
      // Decryption failed - user doesn't have access
      return null;
    }
  }

  // ============ Bulk Query Methods ============

  /**
   * Fetch all assets by issuer
   */
  async getAssetsByIssuer(issuer: PublicKey): Promise<AssetData[]> {
    if (!this.program) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    try {
      const accounts = await (this.program.account as any).rwaAsset.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: issuer.toBase58(),
          },
        },
      ]);

      return accounts.map((a: { account: any; publicKey: PublicKey }) => this.parseAssetAccount(a.account, a.publicKey));
    } catch (error) {
      console.error('Error fetching assets by issuer:', error);
      return [];
    }
  }

  /**
   * Fetch all access grants where user is the grantee
   */
  async getGrantsByGrantee(grantee: PublicKey): Promise<AccessGrantData[]> {
    if (!this.program) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    try {
      const accounts = await (this.program.account as any).accessGrant.all([
        {
          memcmp: {
            offset: 8 + 32, // After discriminator + asset
            bytes: grantee.toBase58(),
          },
        },
      ]);

      return accounts.map((a: { account: any; publicKey: PublicKey }) => this.parseGrantAccount(a.account, a.publicKey));
    } catch (error) {
      console.error('Error fetching grants by grantee:', error);
      return [];
    }
  }

  /**
   * Fetch all access grants for an asset
   */
  async getGrantsByAsset(assetPda: PublicKey): Promise<AccessGrantData[]> {
    if (!this.program) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    try {
      const accounts = await (this.program.account as any).accessGrant.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: assetPda.toBase58(),
          },
        },
      ]);

      return accounts.map((a: { account: any; publicKey: PublicKey }) => this.parseGrantAccount(a.account, a.publicKey));
    } catch (error) {
      console.error('Error fetching grants by asset:', error);
      return [];
    }
  }

  /**
   * Fetch a single asset by PDA
   */
  async getAsset(assetPda: PublicKey): Promise<AssetData | null> {
    if (!this.program) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    try {
      const account = await (this.program.account as any).rwaAsset.fetch(assetPda);
      return this.parseAssetAccount(account, assetPda);
    } catch {
      return null;
    }
  }

  private parseAssetAccount(account: any, pda: PublicKey): AssetData {
    const statusKey = Object.keys(account.status)[0] as 'active' | 'inactive' | 'frozen' | 'transferred';
    return {
      issuer: account.issuer,
      assetId: new Uint8Array(account.assetId),
      assetType: this.parseAssetType(account.assetType),
      encryptedMetadata: new Uint8Array(account.encryptedMetadata),
      issuerEncryptionPubkey: new Uint8Array(account.issuerEncryptionPubkey),
      status: statusKey,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      accessGrantCount: account.accessGrantCount,
      bump: account.bump,
      pda,
    };
  }

  private parseGrantAccount(account: any, pda: PublicKey): AccessGrantData {
    return {
      asset: account.asset,
      grantee: account.grantee,
      grantor: account.grantor,
      accessLevel: this.parseAccessLevel(account.accessLevel),
      encryptedKeyShare: new Uint8Array(account.encryptedKeyShare),
      grantedAt: account.grantedAt,
      expiresAt: account.expiresAt,
      canDelegate: account.canDelegate,
      isRevoked: account.isRevoked,
      revokedAt: account.revokedAt,
      bump: account.bump,
      pda,
    };
  }

  private parseAssetType(assetType: any): number {
    const types: Record<string, number> = {
      realEstate: 0,
      securities: 1,
      commodities: 2,
      receivables: 3,
      intellectualProperty: 4,
      equipment: 5,
      other: 6,
    };
    const key = Object.keys(assetType)[0];
    return types[key] ?? 6;
  }

  private parseAccessLevel(accessLevel: any): number {
    const levels: Record<string, number> = {
      viewBasic: 0,
      viewFull: 1,
      auditor: 2,
      admin: 3,
    };
    const key = Object.keys(accessLevel)[0];
    return levels[key] ?? 0;
  }

  // ============ Write Operations using Anchor ============

  /**
   * Register a new asset on-chain
   */
  async registerAssetOnChain(
    assetId: Uint8Array,
    assetType: AssetType,
    encryptedMetadata: Uint8Array,
    issuerEncryptionPubkey: Uint8Array
  ): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    const [assetPda] = this.getAssetPda(assetId);
    const [protocolConfig] = this.getProtocolConfigPda();

    const assetTypeArg = this.getAssetTypeArg(assetType);

    const tx = await this.program.methods
      .registerAsset(
        Array.from(assetId),
        assetTypeArg,
        Buffer.from(encryptedMetadata),
        Array.from(issuerEncryptionPubkey)
      )
      .accounts({
        issuer: this.provider.wallet.publicKey,
        protocolConfig,
        asset: assetPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Grant access to an asset on-chain
   */
  async grantAccessOnChain(
    assetPda: PublicKey,
    grantee: PublicKey,
    accessLevel: AccessLevel,
    encryptedKeyShare: Uint8Array,
    expiresAt: number = 0,
    canDelegate: boolean = false
  ): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    const [accessGrantPda] = this.getAccessGrantPda(assetPda, grantee);
    const accessLevelArg = this.getAccessLevelArg(accessLevel);

    const tx = await this.program.methods
      .grantAccess(
        accessLevelArg,
        Buffer.from(encryptedKeyShare),
        new BN(expiresAt),
        canDelegate
      )
      .accounts({
        grantor: this.provider.wallet.publicKey,
        grantee,
        asset: assetPda,
        accessGrant: accessGrantPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Revoke access on-chain
   */
  async revokeAccessOnChain(assetPda: PublicKey, grantee: PublicKey): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    const [accessGrantPda] = this.getAccessGrantPda(assetPda, grantee);

    const tx = await this.program.methods
      .revokeAccess()
      .accounts({
        authority: this.provider.wallet.publicKey,
        asset: assetPda,
        accessGrant: accessGrantPda,
      })
      .rpc();

    return tx;
  }

  /**
   * Deactivate an asset on-chain
   */
  async deactivateAssetOnChain(assetPda: PublicKey): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized. Call setWallet() first.');
    }

    const tx = await this.program.methods
      .deactivateAsset()
      .accounts({
        issuer: this.provider.wallet.publicKey,
        asset: assetPda,
      })
      .rpc();

    return tx;
  }

  private getAssetTypeArg(assetType: AssetType): any {
    const types: Record<number, any> = {
      0: { realEstate: {} },
      1: { securities: {} },
      2: { commodities: {} },
      3: { receivables: {} },
      4: { intellectualProperty: {} },
      5: { equipment: {} },
      6: { other: {} },
    };
    return types[assetType] ?? { other: {} };
  }

  private getAccessLevelArg(accessLevel: AccessLevel): any {
    const levels: Record<number, any> = {
      0: { viewBasic: {} },
      1: { viewFull: {} },
      2: { auditor: {} },
      3: { admin: {} },
    };
    return levels[accessLevel] ?? { viewBasic: {} };
  }
}

/**
 * Create a new RWA Secrets client
 */
export function createRwaSecretsClient(
  connection: Connection,
  programId?: PublicKey
): RwaSecretsClient {
  return new RwaSecretsClient(connection, programId);
}

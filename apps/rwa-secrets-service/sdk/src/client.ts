import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  TransactionInstruction,
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
 * RWA Secrets Service client for interacting with the on-chain program
 */
export class RwaSecretsClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId: PublicKey = RWA_SECRETS_PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
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

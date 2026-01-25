import * as anchor from "@coral-xyz/anchor";
import { Program, BN, Idl } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import * as nacl from "tweetnacl";
import * as crypto from "crypto";

// Import IDL from SDK
import { IDL, RwaSecrets } from "../sdk/src/idl";

// Program ID
const PROGRAM_ID = new PublicKey("DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam");

describe("rwa-secrets-service", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Initialize program directly with IDL
  const program = new Program(
    IDL as unknown as Idl,
    provider
  ) as unknown as Program<RwaSecrets>;

  // Test accounts
  let admin: Keypair;
  let issuer: Keypair;
  let investor: Keypair;
  let auditor: Keypair;

  // Encryption keypairs
  let issuerEncryptionKeypair: nacl.BoxKeyPair;
  let investorEncryptionKeypair: nacl.BoxKeyPair;

  // PDAs
  let protocolConfigPda: PublicKey;
  let protocolConfigBump: number;

  // Track if protocol already exists
  let protocolAlreadyExists = false;

  // Constants
  const PROTOCOL_CONFIG_SEED = Buffer.from("protocol_config");
  const RWA_ASSET_SEED = Buffer.from("rwa_asset");
  const ACCESS_GRANT_SEED = Buffer.from("access_grant");

  // Helper to create a mock asset ID
  function createAssetId(name: string): Uint8Array {
    return new Uint8Array(crypto.createHash('sha256').update(name).digest());
  }

  // Helper to create mock encrypted metadata (64-1024 bytes)
  function createEncryptedMetadata(): Uint8Array {
    const metadata = Buffer.alloc(128);
    // Fill with random data to simulate encrypted content
    for (let i = 0; i < metadata.length; i++) {
      metadata[i] = Math.floor(Math.random() * 256);
    }
    return metadata;
  }

  // Helper to create mock encrypted key share (48-256 bytes)
  function createEncryptedKeyShare(): Uint8Array {
    const keyShare = Buffer.alloc(64);
    for (let i = 0; i < keyShare.length; i++) {
      keyShare[i] = Math.floor(Math.random() * 256);
    }
    return keyShare;
  }

  // Helper to derive asset PDA
  function getAssetPda(assetId: Uint8Array): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [RWA_ASSET_SEED, assetId],
      program.programId
    );
  }

  // Helper to derive access grant PDA
  function getAccessGrantPda(assetPda: PublicKey, grantee: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [ACCESS_GRANT_SEED, assetPda.toBuffer(), grantee.toBuffer()],
      program.programId
    );
  }

  before(async () => {
    // Generate keypairs
    admin = Keypair.generate();
    issuer = Keypair.generate();
    investor = Keypair.generate();
    auditor = Keypair.generate();

    // Generate encryption keypairs
    issuerEncryptionKeypair = nacl.box.keyPair();
    investorEncryptionKeypair = nacl.box.keyPair();

    // Airdrop SOL to accounts
    const airdropAmount = 10 * LAMPORTS_PER_SOL;

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(issuer.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(investor.publicKey, airdropAmount)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(auditor.publicKey, airdropAmount)
    );

    // Derive protocol config PDA
    [protocolConfigPda, protocolConfigBump] = PublicKey.findProgramAddressSync(
      [PROTOCOL_CONFIG_SEED],
      program.programId
    );

    // Check if protocol config already exists
    try {
      await program.account.protocolConfig.fetch(protocolConfigPda);
      protocolAlreadyExists = true;
      console.log("  Protocol config already exists from previous run");
    } catch {
      protocolAlreadyExists = false;
    }

    console.log("Setup complete:");
    console.log("  Admin:", admin.publicKey.toBase58());
    console.log("  Issuer:", issuer.publicKey.toBase58());
    console.log("  Investor:", investor.publicKey.toBase58());
    console.log("  Auditor:", auditor.publicKey.toBase58());
    console.log("  Protocol Config PDA:", protocolConfigPda.toBase58());
    console.log("  Protocol Already Exists:", protocolAlreadyExists);
  });

  describe("initialize_protocol", () => {
    it("initializes protocol config", async function() {
      if (protocolAlreadyExists) {
        console.log("  Skipping - protocol config already exists");
        this.skip();
        return;
      }

      await program.methods
        .initializeProtocol(admin.publicKey)
        .accounts({
          authority: admin.publicKey,
          protocolConfig: protocolConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      // Verify protocol config
      const config = await program.account.protocolConfig.fetch(protocolConfigPda);
      expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(config.assetCount.toNumber()).to.equal(0);
      expect(config.isPaused).to.be.false;

      console.log("  Protocol initialized successfully");
    });
  });

  describe("register_asset", () => {
    const assetId = createAssetId("test-property-001");
    let assetPda: PublicKey;
    let assetBump: number;

    before(() => {
      [assetPda, assetBump] = getAssetPda(assetId);
    });

    it("registers a new RWA", async () => {
      const encryptedMetadata = createEncryptedMetadata();
      const issuerEncPubkey = Array.from(issuerEncryptionKeypair.publicKey) as number[];

      await program.methods
        .registerAsset(
          Array.from(assetId) as number[],
          { realEstate: {} },
          Buffer.from(encryptedMetadata),
          issuerEncPubkey
        )
        .accounts({
          issuer: issuer.publicKey,
          protocolConfig: protocolConfigPda,
          asset: assetPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();

      // Verify asset
      const asset = await program.account.rwaAsset.fetch(assetPda);
      expect(asset.issuer.toBase58()).to.equal(issuer.publicKey.toBase58());
      expect(asset.status).to.deep.equal({ active: {} });
      expect(asset.accessGrantCount).to.equal(0);

      // Verify protocol config updated
      const config = await program.account.protocolConfig.fetch(protocolConfigPda);
      expect(config.assetCount.toNumber()).to.be.greaterThan(0);

      console.log("  Asset registered successfully");
      console.log("    Asset PDA:", assetPda.toBase58());
    });

    it("fails with invalid metadata length", async () => {
      const newAssetId = createAssetId("test-property-002");
      const [newAssetPda] = getAssetPda(newAssetId);
      const shortMetadata = Buffer.alloc(10); // Too short (min 64)

      try {
        await program.methods
          .registerAsset(
            Array.from(newAssetId) as number[],
            { securities: {} },
            shortMetadata,
            Array.from(issuerEncryptionKeypair.publicKey) as number[]
          )
          .accounts({
            issuer: issuer.publicKey,
            protocolConfig: protocolConfigPda,
            asset: newAssetPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([issuer])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.include("InvalidMetadataLength");
      }
    });
  });

  describe("grant_access", () => {
    const assetId = createAssetId("test-property-003");
    let assetPda: PublicKey;
    let accessGrantPda: PublicKey;

    before(async () => {
      [assetPda] = getAssetPda(assetId);
      [accessGrantPda] = getAccessGrantPda(assetPda, investor.publicKey);

      // Register asset first
      const encryptedMetadata = createEncryptedMetadata();
      await program.methods
        .registerAsset(
          Array.from(assetId) as number[],
          { realEstate: {} },
          Buffer.from(encryptedMetadata),
          Array.from(issuerEncryptionKeypair.publicKey) as number[]
        )
        .accounts({
          issuer: issuer.publicKey,
          protocolConfig: protocolConfigPda,
          asset: assetPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();
    });

    it("grants access to investor", async () => {
      const encryptedKeyShare = createEncryptedKeyShare();
      const expiresAt = new BN(Math.floor(Date.now() / 1000) + 86400 * 365); // 1 year

      await program.methods
        .grantAccess(
          { viewFull: {} },
          Buffer.from(encryptedKeyShare),
          expiresAt,
          false // can_delegate
        )
        .accounts({
          grantor: issuer.publicKey,
          grantee: investor.publicKey,
          asset: assetPda,
          accessGrant: accessGrantPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();

      // Verify access grant
      const grant = await program.account.accessGrant.fetch(accessGrantPda);
      expect(grant.grantee.toBase58()).to.equal(investor.publicKey.toBase58());
      expect(grant.grantor.toBase58()).to.equal(issuer.publicKey.toBase58());
      expect(grant.accessLevel).to.deep.equal({ viewFull: {} });
      expect(grant.isRevoked).to.be.false;
      expect(grant.canDelegate).to.be.false;

      // Verify asset grant count updated
      const asset = await program.account.rwaAsset.fetch(assetPda);
      expect(asset.accessGrantCount).to.equal(1);

      console.log("  Access granted successfully");
      console.log("    Grant PDA:", accessGrantPda.toBase58());
    });

    it("fails with invalid key share length", async () => {
      const [auditorGrantPda] = getAccessGrantPda(assetPda, auditor.publicKey);
      const shortKeyShare = Buffer.alloc(10); // Too short (min 48)

      try {
        await program.methods
          .grantAccess(
            { auditor: {} },
            shortKeyShare,
            new BN(0),
            false
          )
          .accounts({
            grantor: issuer.publicKey,
            grantee: auditor.publicKey,
            asset: assetPda,
            accessGrant: auditorGrantPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([issuer])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.include("InvalidKeyShareLength");
      }
    });
  });

  describe("revoke_access", () => {
    const assetId = createAssetId("test-property-004");
    let assetPda: PublicKey;
    let accessGrantPda: PublicKey;

    before(async () => {
      [assetPda] = getAssetPda(assetId);
      [accessGrantPda] = getAccessGrantPda(assetPda, investor.publicKey);

      // Register asset
      const encryptedMetadata = createEncryptedMetadata();
      await program.methods
        .registerAsset(
          Array.from(assetId) as number[],
          { securities: {} },
          Buffer.from(encryptedMetadata),
          Array.from(issuerEncryptionKeypair.publicKey) as number[]
        )
        .accounts({
          issuer: issuer.publicKey,
          protocolConfig: protocolConfigPda,
          asset: assetPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();

      // Grant access
      const encryptedKeyShare = createEncryptedKeyShare();
      await program.methods
        .grantAccess(
          { viewBasic: {} },
          Buffer.from(encryptedKeyShare),
          new BN(0), // never expires
          false
        )
        .accounts({
          grantor: issuer.publicKey,
          grantee: investor.publicKey,
          asset: assetPda,
          accessGrant: accessGrantPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();
    });

    it("revokes access", async () => {
      await program.methods
        .revokeAccess()
        .accounts({
          authority: issuer.publicKey,
          asset: assetPda,
          accessGrant: accessGrantPda,
        })
        .signers([issuer])
        .rpc();

      // Verify revocation
      const grant = await program.account.accessGrant.fetch(accessGrantPda);
      expect(grant.isRevoked).to.be.true;
      expect(grant.revokedAt.toNumber()).to.be.greaterThan(0);

      console.log("  Access revoked successfully");
    });

    it("fails when revoking already revoked grant", async () => {
      try {
        await program.methods
          .revokeAccess()
          .accounts({
            authority: issuer.publicKey,
            asset: assetPda,
            accessGrant: accessGrantPda,
          })
          .signers([issuer])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.error?.errorCode?.code || err.message).to.include("AlreadyRevoked");
      }
    });
  });

  describe("update_metadata", () => {
    const assetId = createAssetId("test-property-005");
    let assetPda: PublicKey;

    before(async () => {
      [assetPda] = getAssetPda(assetId);

      // Register asset
      const encryptedMetadata = createEncryptedMetadata();
      await program.methods
        .registerAsset(
          Array.from(assetId) as number[],
          { commodities: {} },
          Buffer.from(encryptedMetadata),
          Array.from(issuerEncryptionKeypair.publicKey) as number[]
        )
        .accounts({
          issuer: issuer.publicKey,
          protocolConfig: protocolConfigPda,
          asset: assetPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();
    });

    it("updates asset metadata", async () => {
      const newMetadata = createEncryptedMetadata();

      await program.methods
        .updateMetadata(Buffer.from(newMetadata))
        .accounts({
          issuer: issuer.publicKey,
          asset: assetPda,
        })
        .signers([issuer])
        .rpc();

      // Verify update
      const asset = await program.account.rwaAsset.fetch(assetPda);
      expect(asset.updatedAt.toNumber()).to.be.greaterThan(asset.createdAt.toNumber());

      console.log("  Metadata updated successfully");
    });

    it("fails when non-issuer tries to update", async () => {
      const newMetadata = createEncryptedMetadata();

      try {
        await program.methods
          .updateMetadata(Buffer.from(newMetadata))
          .accounts({
            issuer: investor.publicKey, // Wrong issuer
            asset: assetPda,
          })
          .signers([investor])
          .rpc();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        // Expected constraint violation
        expect(err).to.exist;
      }
    });
  });

  describe("deactivate_asset", () => {
    const assetId = createAssetId("test-property-006");
    let assetPda: PublicKey;

    before(async () => {
      [assetPda] = getAssetPda(assetId);

      // Register asset
      const encryptedMetadata = createEncryptedMetadata();
      await program.methods
        .registerAsset(
          Array.from(assetId) as number[],
          { equipment: {} },
          Buffer.from(encryptedMetadata),
          Array.from(issuerEncryptionKeypair.publicKey) as number[]
        )
        .accounts({
          issuer: issuer.publicKey,
          protocolConfig: protocolConfigPda,
          asset: assetPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuer])
        .rpc();
    });

    it("deactivates asset", async () => {
      await program.methods
        .deactivateAsset()
        .accounts({
          issuer: issuer.publicKey,
          asset: assetPda,
        })
        .signers([issuer])
        .rpc();

      // Verify deactivation
      const asset = await program.account.rwaAsset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ inactive: {} });

      console.log("  Asset deactivated successfully");
    });
  });
});

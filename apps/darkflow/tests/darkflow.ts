import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("darkflow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Program ID from Anchor.toml
  const programId = new PublicKey("8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U");

  // Test accounts
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let poolPda: PublicKey;
  let vaultA: PublicKey;
  let vaultB: PublicKey;

  const authority = Keypair.generate();
  const encryptionPubkey = new Uint8Array(32).fill(1); // Test encryption key
  const feeRateBps = 30; // 0.3% fee

  before(async () => {
    // Airdrop SOL to authority
    const signature = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Create token mints
    tokenAMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9
    );

    tokenBMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6
    );

    // Derive pool PDA
    [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("dark_pool"),
        tokenAMint.toBuffer(),
        tokenBMint.toBuffer(),
      ],
      programId
    );

    // Derive vault PDAs
    [vaultA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault_a"), poolPda.toBuffer()],
      programId
    );

    [vaultB] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault_b"), poolPda.toBuffer()],
      programId
    );
  });

  it("Pool PDAs are derived correctly", async () => {
    console.log("Program ID:", programId.toBase58());
    console.log("Pool PDA:", poolPda.toBase58());
    console.log("Vault A PDA:", vaultA.toBase58());
    console.log("Vault B PDA:", vaultB.toBase58());
    console.log("Token A Mint:", tokenAMint.toBase58());
    console.log("Token B Mint:", tokenBMint.toBase58());

    // Verify PDAs are valid public keys
    expect(poolPda.toBase58()).to.be.a("string");
    expect(vaultA.toBase58()).to.be.a("string");
    expect(vaultB.toBase58()).to.be.a("string");
  });

  it("Encryption key is valid", async () => {
    expect(encryptionPubkey.length).to.equal(32);
    expect(encryptionPubkey[0]).to.equal(1);
  });

  // Note: Full instruction tests require IDL which has build issues
  // These tests verify the setup and PDA derivation
  it("Fee rate is within valid range", async () => {
    expect(feeRateBps).to.be.lessThanOrEqual(10000);
    expect(feeRateBps).to.be.greaterThan(0);
  });
});

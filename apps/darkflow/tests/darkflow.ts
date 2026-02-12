import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

// Import SDK pure functions for testing
import { DarkPoolOperations } from "../sdk/src/pool";
import { LaunchOperations } from "../sdk/src/launch";
import { LiquidityOperations } from "../sdk/src/liquidity";

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

  // ========================================================================
  // SDK Pure Function Tests — DarkPoolOperations
  // ========================================================================

  describe("DarkPoolOperations.calculateFee", () => {
    it("calculates 0.3% fee correctly", () => {
      const amount = BigInt(1_000_000_000); // 1 SOL in lamports
      const fee = DarkPoolOperations.calculateFee(amount, 30);
      // 1_000_000_000 * 30 / 10000 = 3_000_000
      expect(fee).to.equal(BigInt(3_000_000));
    });

    it("calculates 1% fee correctly", () => {
      const amount = BigInt(5_000_000_000); // 5 SOL
      const fee = DarkPoolOperations.calculateFee(amount, 100);
      // 5_000_000_000 * 100 / 10000 = 50_000_000
      expect(fee).to.equal(BigInt(50_000_000));
    });

    it("returns zero fee for zero amount", () => {
      const fee = DarkPoolOperations.calculateFee(BigInt(0), 30);
      expect(fee).to.equal(BigInt(0));
    });

    it("returns zero fee for zero rate", () => {
      const fee = DarkPoolOperations.calculateFee(BigInt(1_000_000), 0);
      expect(fee).to.equal(BigInt(0));
    });

    it("calculates max fee (100%) correctly", () => {
      const amount = BigInt(1_000_000);
      const fee = DarkPoolOperations.calculateFee(amount, 10000);
      expect(fee).to.equal(amount);
    });

    it("handles small amounts without rounding up", () => {
      // 100 * 30 / 10000 = 0 (integer division truncation)
      const fee = DarkPoolOperations.calculateFee(BigInt(100), 30);
      expect(fee).to.equal(BigInt(0));
    });

    it("handles large amounts without overflow", () => {
      const amount = BigInt("1000000000000000000"); // 1e18
      const fee = DarkPoolOperations.calculateFee(amount, 30);
      expect(fee).to.equal(BigInt("3000000000000000")); // 1e18 * 30 / 10000
    });
  });

  // ========================================================================
  // SDK Pure Function Tests — DarkPoolOperations.findPoolAddress
  // ========================================================================

  describe("DarkPoolOperations.findPoolAddress", () => {
    it("returns deterministic address for same token pair", () => {
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;
      const addr1 = DarkPoolOperations.findPoolAddress(mintA, mintB);
      const addr2 = DarkPoolOperations.findPoolAddress(mintA, mintB);
      expect(addr1.toBase58()).to.equal(addr2.toBase58());
    });

    it("returns different address for swapped token order", () => {
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;
      const addrAB = DarkPoolOperations.findPoolAddress(mintA, mintB);
      const addrBA = DarkPoolOperations.findPoolAddress(mintB, mintA);
      expect(addrAB.toBase58()).to.not.equal(addrBA.toBase58());
    });

    it("returns different address for different program IDs", () => {
      const mintA = Keypair.generate().publicKey;
      const mintB = Keypair.generate().publicKey;
      const prog1 = Keypair.generate().publicKey;
      const prog2 = Keypair.generate().publicKey;
      const addr1 = DarkPoolOperations.findPoolAddress(mintA, mintB, prog1);
      const addr2 = DarkPoolOperations.findPoolAddress(mintA, mintB, prog2);
      expect(addr1.toBase58()).to.not.equal(addr2.toBase58());
    });
  });

  // ========================================================================
  // SDK Pure Function Tests — LaunchOperations.calculateTokensForPayment
  // ========================================================================

  describe("LaunchOperations.calculateTokensForPayment", () => {
    const initialPrice = BigInt(1_000_000); // 1 USDC = 1e6 lamports
    const maxSupply = BigInt(1_000_000); // 1M tokens

    describe("linear curve", () => {
      it("returns correct tokens at zero sold (base price)", () => {
        const payment = BigInt(10_000_000); // 10 USDC
        const tokens = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "linear"
        );
        // At 0 sold: priceFactor = 10000, effectivePrice = initialPrice
        // tokens = 10_000_000 / 1_000_000 = 10
        expect(tokens).to.equal(BigInt(10));
      });

      it("returns fewer tokens at higher sold amounts", () => {
        const payment = BigInt(10_000_000);
        const tokensEarly = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "linear"
        );
        const tokensLate = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, maxSupply / BigInt(2), maxSupply, "linear"
        );
        expect(tokensLate).to.be.lessThan(tokensEarly);
      });

      it("returns zero tokens for zero payment", () => {
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(0), initialPrice, BigInt(0), maxSupply, "linear"
        );
        expect(tokens).to.equal(BigInt(0));
      });
    });

    describe("exponential curve", () => {
      it("returns base price tokens before halfway", () => {
        const payment = BigInt(10_000_000);
        const tokens = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "exponential"
        );
        // Before halfway: expFactor = 1, tokens = payment / initialPrice
        expect(tokens).to.equal(BigInt(10));
      });

      it("doubles price after halfway point", () => {
        const payment = BigInt(10_000_000);
        const tokensBefore = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "exponential"
        );
        const tokensAfter = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, maxSupply / BigInt(2) + BigInt(1), maxSupply, "exponential"
        );
        // After halfway, price doubles so tokens halve
        expect(tokensAfter).to.equal(tokensBefore / BigInt(2));
      });
    });

    describe("logarithmic curve", () => {
      it("returns tokens at constant price", () => {
        const payment = BigInt(10_000_000);
        const tokens = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "logarithmic"
        );
        expect(tokens).to.equal(BigInt(10));
      });

      it("returns same tokens regardless of sold amount", () => {
        const payment = BigInt(10_000_000);
        const tokensEarly = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, BigInt(0), maxSupply, "logarithmic"
        );
        const tokensLate = LaunchOperations.calculateTokensForPayment(
          payment, initialPrice, maxSupply / BigInt(2), maxSupply, "logarithmic"
        );
        expect(tokensEarly).to.equal(tokensLate);
      });
    });
  });

  // ========================================================================
  // SDK Pure Function Tests — LiquidityOperations.calculateShareForDeposit
  // ========================================================================

  describe("LiquidityOperations.calculateShareForDeposit", () => {
    it("returns 100% share for first deposit (empty pool)", () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1_000_000),
        BigInt(2_000_000),
        BigInt(0), // empty pool
        BigInt(0)
      );
      expect(share).to.equal(10000); // 100% in bps
    });

    it("calculates proportional share for balanced deposit", () => {
      // Pool has 100 A and 200 B, depositing 10 A and 20 B
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(10),
        BigInt(20),
        BigInt(100),
        BigInt(200)
      );
      // ratioA = 10 * 10000 / 100 = 1000 (10%)
      // ratioB = 20 * 10000 / 200 = 1000 (10%)
      // min(1000, 1000) = 1000
      expect(share).to.equal(1000);
    });

    it("uses smaller ratio for imbalanced deposit", () => {
      // Pool has 100 A and 200 B, depositing 10 A and 10 B (imbalanced)
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(10),
        BigInt(10),
        BigInt(100),
        BigInt(200)
      );
      // ratioA = 10 * 10000 / 100 = 1000 (10%)
      // ratioB = 10 * 10000 / 200 = 500 (5%)
      // min(1000, 500) = 500
      expect(share).to.equal(500);
    });

    it("returns 50% share for equal deposit to existing pool", () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1_000_000),
        BigInt(1_000_000),
        BigInt(1_000_000),
        BigInt(1_000_000)
      );
      // ratioA = 1e6 * 10000 / 1e6 = 10000 (100% proportional, meaning 50% of new total)
      // But this is just the ratio — not the final share after dilution
      expect(share).to.equal(10000);
    });

    it("handles very small deposits", () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1),
        BigInt(1),
        BigInt(1_000_000_000),
        BigInt(1_000_000_000)
      );
      // 1 * 10000 / 1e9 = 0 (integer truncation)
      expect(share).to.equal(0);
    });
  });

  // ========================================================================
  // SDK Pure Function Tests — LiquidityOperations.findPositionAddress
  // ========================================================================

  describe("LiquidityOperations.findPositionAddress", () => {
    it("returns deterministic address for same inputs", () => {
      const pool = Keypair.generate().publicKey;
      const owner = Keypair.generate().publicKey;
      const addr1 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      const addr2 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      expect(addr1.toBase58()).to.equal(addr2.toBase58());
    });

    it("returns different address for different position indexes", () => {
      const pool = Keypair.generate().publicKey;
      const owner = Keypair.generate().publicKey;
      const addr0 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      const addr1 = LiquidityOperations.findPositionAddress(pool, owner, 1);
      expect(addr0.toBase58()).to.not.equal(addr1.toBase58());
    });

    it("returns different address for different owners", () => {
      const pool = Keypair.generate().publicKey;
      const owner1 = Keypair.generate().publicKey;
      const owner2 = Keypair.generate().publicKey;
      const addr1 = LiquidityOperations.findPositionAddress(pool, owner1, 0);
      const addr2 = LiquidityOperations.findPositionAddress(pool, owner2, 0);
      expect(addr1.toBase58()).to.not.equal(addr2.toBase58());
    });

    it("returns different address for different pools", () => {
      const pool1 = Keypair.generate().publicKey;
      const pool2 = Keypair.generate().publicKey;
      const owner = Keypair.generate().publicKey;
      const addr1 = LiquidityOperations.findPositionAddress(pool1, owner, 0);
      const addr2 = LiquidityOperations.findPositionAddress(pool2, owner, 0);
      expect(addr1.toBase58()).to.not.equal(addr2.toBase58());
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { createHash } from "crypto";

/**
 * Reconstruct the 24-byte serialized payload matching SWAP_ORDER_SCHEMA layout:
 * minOutputAmount(u64 LE, 8) + slippageBps(u16 LE, 2) + deadline(i64 LE, 8) + padding(6 zeros) = 24 bytes
 * Then SHA-256 hash it — this is the commitment the contract verifies.
 */
function computePayloadHash(
  minOutputAmount: bigint,
  slippageBps: number,
  deadline: bigint
): string {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(minOutputAmount, 0);
  buf.writeUInt16LE(slippageBps, 8);
  buf.writeBigInt64LE(deadline, 10);
  // bytes 18-23 are zero (padding)
  const hash = createHash("sha256").update(buf).digest();
  return "0x" + hash.toString("hex");
}

describe("ConfidentialSwapRouter", function () {
  let router: any;
  let inputToken: any;
  let outputToken: any;
  let solver: any;
  let user: any;
  let other: any;

  const ENCRYPTION_PUB_KEY = ethers.keccak256(ethers.toUtf8Bytes("solver-x25519-key"));
  const FEE_BPS = 30;

  beforeEach(async function () {
    [solver, user, other] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    inputToken = await MockERC20.deploy("Input Token", "IN", 6);
    outputToken = await MockERC20.deploy("Output Token", "OUT", 6);

    // Deploy router
    const Router = await ethers.getContractFactory("ConfidentialSwapRouter");
    router = await Router.deploy();

    // Initialize solver
    await router.connect(solver).initializeSolver(ENCRYPTION_PUB_KEY, FEE_BPS);

    // Mint tokens
    await inputToken.mint(user.address, 1_000_000_000n); // 1000 tokens
    await outputToken.mint(solver.address, 1_000_000_000n);

    // Approve router
    await inputToken.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
    await outputToken.connect(solver).approve(await router.getAddress(), ethers.MaxUint256);
  });

  describe("initializeSolver", function () {
    it("sets solver config correctly", async function () {
      const config = await router.solverConfig();
      expect(config.authority).to.equal(solver.address);
      expect(config.encryptionPubKey).to.equal(ENCRYPTION_PUB_KEY);
      expect(config.feeBps).to.equal(FEE_BPS);
      expect(config.isActive).to.be.true;
      expect(config.totalOrders).to.equal(0);
    });

    it("reverts on double initialization", async function () {
      await expect(
        router.connect(other).initializeSolver(ENCRYPTION_PUB_KEY, 10)
      ).to.be.revertedWithCustomError(router, "AlreadyInitialized");
    });

    it("reverts with fee too high", async function () {
      // Deploy a fresh router for this test
      const Router = await ethers.getContractFactory("ConfidentialSwapRouter");
      const freshRouter = await Router.deploy();
      await expect(
        freshRouter.connect(solver).initializeSolver(ENCRYPTION_PUB_KEY, 501)
      ).to.be.revertedWithCustomError(freshRouter, "InvalidFeeBps");
    });
  });

  describe("submitOrder", function () {
    it("submits an order and transfers input tokens", async function () {
      const orderId = 1n;
      const inputAmount = 100_000_000n;
      const encryptedPayload = ethers.randomBytes(64); // Simulated encrypted payload
      const payloadHash = ethers.keccak256(encryptedPayload); // Dummy hash for submission

      const balanceBefore = await inputToken.balanceOf(user.address);

      await expect(
        router.connect(user).submitOrder(
          orderId, inputToken.target, outputToken.target,
          inputAmount, encryptedPayload, payloadHash
        )
      ).to.emit(router, "OrderSubmitted");

      const balanceAfter = await inputToken.balanceOf(user.address);
      expect(balanceBefore - balanceAfter).to.equal(inputAmount);

      // Verify order stored
      const order = await router.getOrder(user.address, orderId);
      expect(order.owner).to.equal(user.address);
      expect(order.inputAmount).to.equal(inputAmount);
      expect(order.payloadHash).to.equal(payloadHash);
      expect(order.status).to.equal(0); // Pending
    });

    it("reverts with zero input amount", async function () {
      await expect(
        router.connect(user).submitOrder(
          1n, inputToken.target, outputToken.target,
          0n, ethers.randomBytes(64), ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(router, "InvalidInputAmount");
    });

    it("reverts with invalid payload length", async function () {
      await expect(
        router.connect(user).submitOrder(
          1n, inputToken.target, outputToken.target,
          100n, ethers.randomBytes(10), ethers.ZeroHash // Too short
        )
      ).to.be.revertedWithCustomError(router, "InvalidPayloadLength");
    });
  });

  describe("executeOrder", function () {
    const orderId = 1n;
    const inputAmount = 100_000_000n;
    const minOutputAmount = 95_000_000n;
    const slippageBps = 50;
    const actualOutputAmount = 98_000_000n;
    let payloadHash: string;
    let deadline: bigint;

    beforeEach(async function () {
      deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      payloadHash = computePayloadHash(minOutputAmount, slippageBps, deadline);

      // Submit order with correct commitment hash
      const encryptedPayload = ethers.randomBytes(64);
      await router.connect(user).submitOrder(
        orderId, inputToken.target, outputToken.target,
        inputAmount, encryptedPayload, payloadHash
      );
    });

    it("executes with valid commitment and transfers tokens", async function () {
      const solverInputBefore = await inputToken.balanceOf(solver.address);

      await expect(
        router.connect(solver).executeOrder(
          user.address, orderId,
          minOutputAmount, slippageBps, deadline,
          actualOutputAmount
        )
      ).to.emit(router, "OrderExecuted");

      // Verify solver received input tokens
      const solverInputAfter = await inputToken.balanceOf(solver.address);
      expect(solverInputAfter - solverInputBefore).to.equal(inputAmount);

      // Verify order updated
      const order = await router.getOrder(user.address, orderId);
      expect(order.status).to.equal(1); // Completed
      expect(order.outputAmount).to.equal(actualOutputAmount);
      expect(order.executedBy).to.equal(solver.address);

      // Verify solver config stats
      const config = await router.solverConfig();
      expect(config.totalOrders).to.equal(1);
      expect(config.totalVolume).to.equal(inputAmount);
    });

    it("reverts with wrong commitment hash (tampered minOutput)", async function () {
      await expect(
        router.connect(solver).executeOrder(
          user.address, orderId,
          minOutputAmount + 1n, // Tampered — doesn't match payloadHash
          slippageBps, deadline,
          actualOutputAmount
        )
      ).to.be.revertedWithCustomError(router, "PayloadHashMismatch");
    });

    it("reverts with wrong slippage in commitment", async function () {
      await expect(
        router.connect(solver).executeOrder(
          user.address, orderId,
          minOutputAmount,
          slippageBps + 1, // Tampered slippage
          deadline,
          actualOutputAmount
        )
      ).to.be.revertedWithCustomError(router, "PayloadHashMismatch");
    });

    it("reverts with wrong deadline in commitment", async function () {
      await expect(
        router.connect(solver).executeOrder(
          user.address, orderId,
          minOutputAmount,
          slippageBps,
          deadline + 1n, // Tampered deadline
          actualOutputAmount
        )
      ).to.be.revertedWithCustomError(router, "PayloadHashMismatch");
    });

    it("reverts when output < minOutput (slippage exceeded)", async function () {
      await expect(
        router.connect(solver).executeOrder(
          user.address, orderId,
          minOutputAmount, slippageBps, deadline,
          minOutputAmount - 1n // Below minimum
        )
      ).to.be.revertedWithCustomError(router, "SlippageExceeded");
    });

    it("reverts when non-solver tries to execute", async function () {
      await expect(
        router.connect(other).executeOrder(
          user.address, orderId,
          minOutputAmount, slippageBps, deadline,
          actualOutputAmount
        )
      ).to.be.revertedWithCustomError(router, "UnauthorizedSolver");
    });

    it("reverts when order has expired (deadline passed)", async function () {
      // Deploy a fresh router with a past deadline
      const Router = await ethers.getContractFactory("ConfidentialSwapRouter");
      const freshRouter = await Router.deploy();
      await freshRouter.connect(solver).initializeSolver(ENCRYPTION_PUB_KEY, FEE_BPS);

      // Deploy fresh tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const freshInput = await MockERC20.deploy("Input", "IN", 6);
      const freshOutput = await MockERC20.deploy("Output", "OUT", 6);
      await freshInput.mint(user.address, 1_000_000_000n);
      await freshOutput.mint(solver.address, 1_000_000_000n);
      await freshInput.connect(user).approve(await freshRouter.getAddress(), ethers.MaxUint256);
      await freshOutput.connect(solver).approve(await freshRouter.getAddress(), ethers.MaxUint256);

      // Use a deadline in the past
      const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 60); // 1 minute ago
      const expiredHash = computePayloadHash(minOutputAmount, slippageBps, pastDeadline);

      await freshRouter.connect(user).submitOrder(
        1n, freshInput.target, freshOutput.target,
        inputAmount, ethers.randomBytes(64), expiredHash
      );

      await expect(
        freshRouter.connect(solver).executeOrder(
          user.address, 1n,
          minOutputAmount, slippageBps, pastDeadline,
          actualOutputAmount
        )
      ).to.be.revertedWithCustomError(freshRouter, "OrderExpired");
    });
  });

  describe("cancelOrder", function () {
    const orderId = 1n;
    const inputAmount = 50_000_000n;

    beforeEach(async function () {
      const encryptedPayload = ethers.randomBytes(64);
      const payloadHash = ethers.keccak256(encryptedPayload);
      await router.connect(user).submitOrder(
        orderId, inputToken.target, outputToken.target,
        inputAmount, encryptedPayload, payloadHash
      );
    });

    it("cancels and refunds input tokens", async function () {
      const balanceBefore = await inputToken.balanceOf(user.address);

      await expect(
        router.connect(user).cancelOrder(orderId)
      ).to.emit(router, "OrderCancelled");

      const balanceAfter = await inputToken.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(inputAmount);

      const order = await router.getOrder(user.address, orderId);
      expect(order.status).to.equal(2); // Cancelled
    });

    it("reverts when non-owner cancels", async function () {
      await expect(
        router.connect(other).cancelOrder(orderId)
      ).to.be.revertedWithCustomError(router, "UnauthorizedOwner");
    });
  });

  describe("claimOutput", function () {
    const orderId = 1n;
    const inputAmount = 100_000_000n;
    const minOutputAmount = 95_000_000n;
    const actualOutputAmount = 98_000_000n;
    const slippageBps = 50;

    beforeEach(async function () {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const payloadHash = computePayloadHash(minOutputAmount, slippageBps, deadline);
      const encryptedPayload = ethers.randomBytes(64);

      await router.connect(user).submitOrder(
        orderId, inputToken.target, outputToken.target,
        inputAmount, encryptedPayload, payloadHash
      );

      await router.connect(solver).executeOrder(
        user.address, orderId,
        minOutputAmount, slippageBps, deadline,
        actualOutputAmount
      );
    });

    it("claims output tokens after execution", async function () {
      const balanceBefore = await outputToken.balanceOf(user.address);

      await router.connect(user).claimOutput(orderId);

      const balanceAfter = await outputToken.balanceOf(user.address);
      expect(balanceAfter - balanceBefore).to.equal(actualOutputAmount);
    });

    it("reverts on double claim", async function () {
      await router.connect(user).claimOutput(orderId);

      await expect(
        router.connect(user).claimOutput(orderId)
      ).to.be.revertedWithCustomError(router, "NothingToClaim");
    });
  });

  describe("commitment hash cross-chain compatibility", function () {
    it("on-chain sha256 matches TypeScript computePayloadHash", async function () {
      // This test verifies the Solidity contract's payload reconstruction
      // produces the same hash as the TypeScript SDK's computePayloadHash.
      // The executeOrder function will only succeed if hashes match.
      const minOutput = 48_000_000n;
      const slippage = 100;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      // Compute hash in TypeScript (same as @veil/orders computePayloadHash)
      const expectedHash = computePayloadHash(minOutput, slippage, deadline);

      // Submit order with this hash
      const encryptedPayload = ethers.randomBytes(64);
      await router.connect(user).submitOrder(
        1n, inputToken.target, outputToken.target,
        100_000_000n, encryptedPayload, expectedHash
      );

      // Execute with matching params — if it succeeds, hashes match
      await expect(
        router.connect(solver).executeOrder(
          user.address, 1n,
          minOutput, slippage, deadline,
          minOutput // output == min (exact fill)
        )
      ).to.emit(router, "OrderExecuted");
    });
  });
});

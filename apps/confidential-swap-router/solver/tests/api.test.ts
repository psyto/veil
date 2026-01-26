import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { Keypair, Connection } from '@solana/web3.js';
import { createSolverApiRouter } from '../src/api';
import { ConfidentialSwapSolver, SolverConfig } from '../src/solver';

describe('Solver API', () => {
  let app: express.Application;
  let solver: ConfidentialSwapSolver;

  before(() => {
    // Create a mock solver with test keypair
    const testKeypair = Keypair.generate();
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const config: SolverConfig = {
      connection,
      solverKeypair: testKeypair,
      programId: Keypair.generate().publicKey,
      pollIntervalMs: 5000,
    };

    solver = new ConfidentialSwapSolver(config);

    // Create Express app with API router
    app = express();
    app.use(express.json());
    app.use('/api', createSolverApiRouter(solver));
  });

  describe('GET /api/solver-pubkey', () => {
    it('should return solver encryption pubkey in hex and base64', async () => {
      const res = await request(app)
        .get('/api/solver-pubkey')
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.encryptionPubkey).to.be.a('string');
      expect(res.body.encryptionPubkeyBase64).to.be.a('string');

      // Verify hex format (64 characters for 32 bytes)
      expect(res.body.encryptionPubkey).to.have.lengthOf(64);

      // Verify it's valid hex
      expect(/^[0-9a-f]+$/i.test(res.body.encryptionPubkey)).to.be.true;
    });

    it('should return consistent pubkey across requests', async () => {
      const res1 = await request(app).get('/api/solver-pubkey');
      const res2 = await request(app).get('/api/solver-pubkey');

      expect(res1.body.encryptionPubkey).to.equal(res2.body.encryptionPubkey);
    });
  });

  describe('POST /api/register-encryption-pubkey', () => {
    it('should register a valid user encryption pubkey', async () => {
      const userAddress = Keypair.generate().publicKey.toBase58();
      const encryptionPubkey = Buffer.from(Keypair.generate().publicKey.toBytes()).toString('hex');

      const res = await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress, encryptionPubkey })
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include(userAddress);
      expect(res.body.registeredUsers).to.be.at.least(1);
    });

    it('should fail with missing userAddress', async () => {
      const encryptionPubkey = Buffer.from(Keypair.generate().publicKey.toBytes()).toString('hex');

      const res = await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ encryptionPubkey })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('userAddress');
    });

    it('should fail with invalid Solana address', async () => {
      const encryptionPubkey = Buffer.from(Keypair.generate().publicKey.toBytes()).toString('hex');

      const res = await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress: 'invalid-address', encryptionPubkey })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('Invalid Solana address');
    });

    it('should fail with missing encryptionPubkey', async () => {
      const userAddress = Keypair.generate().publicKey.toBase58();

      const res = await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress })
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('encryptionPubkey');
    });

    it('should fail with invalid encryptionPubkey length', async () => {
      const userAddress = Keypair.generate().publicKey.toBase58();

      const res = await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress, encryptionPubkey: 'abc123' }) // Too short
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('32-byte');
    });

    it('should overwrite existing registration for same user', async () => {
      const userAddress = Keypair.generate().publicKey.toBase58();
      const encryptionPubkey1 = Buffer.from(Keypair.generate().publicKey.toBytes()).toString('hex');
      const encryptionPubkey2 = Buffer.from(Keypair.generate().publicKey.toBytes()).toString('hex');

      // First registration
      await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress, encryptionPubkey: encryptionPubkey1 })
        .expect(200);

      const countBefore = (await request(app).get('/api/health')).body.registeredUsers;

      // Second registration (should overwrite)
      await request(app)
        .post('/api/register-encryption-pubkey')
        .send({ userAddress, encryptionPubkey: encryptionPubkey2 })
        .expect(200);

      const countAfter = (await request(app).get('/api/health')).body.registeredUsers;

      // Count should not increase
      expect(countAfter).to.equal(countBefore);
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.status).to.equal('healthy');
      expect(res.body.registeredUsers).to.be.a('number');
    });
  });
});

describe('Jupiter Quote Integration', () => {
  const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';

  // Token mints (mainnet)
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  it('should fetch quote from Jupiter API', async () => {
    const params = new URLSearchParams({
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      amount: '1000000000', // 1 SOL
      slippageBps: '50',
    });

    const response = await fetch(`${JUPITER_QUOTE_URL}?${params}`);
    const data = await response.json();

    // Note: This may fail if Jupiter API is down or rate limited
    if (response.ok) {
      expect(data.inputMint).to.equal(SOL_MINT);
      expect(data.outputMint).to.equal(USDC_MINT);
      expect(data.inAmount).to.equal('1000000000');
      expect(data.outAmount).to.be.a('string');
      expect(parseInt(data.outAmount)).to.be.greaterThan(0);
    } else {
      // API may be rate limited in test environment
      console.log('Jupiter API not available:', data.error || 'Unknown error');
    }
  });

  it('should return error for invalid token mint', async () => {
    const params = new URLSearchParams({
      inputMint: 'invalid-mint',
      outputMint: USDC_MINT,
      amount: '1000000000',
      slippageBps: '50',
    });

    const response = await fetch(`${JUPITER_QUOTE_URL}?${params}`);
    const data = await response.json();

    // Jupiter should return an error for invalid mint
    if (!response.ok || data.error) {
      expect(data.error || data.errorCode).to.exist;
    }
  });

  it('should handle very small amounts', async () => {
    const params = new URLSearchParams({
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      amount: '1000', // 0.000001 SOL
      slippageBps: '50',
    });

    const response = await fetch(`${JUPITER_QUOTE_URL}?${params}`);
    const data = await response.json();

    // Small amounts may not have routes
    if (response.ok && !data.error) {
      expect(data.inAmount).to.equal('1000');
    }
  });
});

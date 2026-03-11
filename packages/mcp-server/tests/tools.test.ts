import { handleTool } from '../src/index.js';

/** Parse the JSON string from the first content block */
function parseResult(result: any): any {
  return JSON.parse(result.content[0].text);
}

/** Generate a base64-encoded random 32-byte seed */
function randomSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

describe('mcp-server tools', () => {
  // ── generate_keypair ────────────────────────────────────────────────

  describe('generate_keypair', () => {
    it('returns JSON with publicKey and secretKey as base64', async () => {
      const result = await handleTool('generate_keypair', {});
      const data = parseResult(result);
      expect(data.publicKey).toBeDefined();
      expect(data.secretKey).toBeDefined();
      // base64 of 32 bytes = 44 chars
      expect(data.publicKey.length).toBe(44);
      expect(data.secretKey.length).toBe(44);
    });
  });

  // ── derive_keypair ──────────────────────────────────────────────────

  describe('derive_keypair', () => {
    it('is deterministic — same seed produces same keypair', async () => {
      const seed = randomSeed();
      const r1 = parseResult(await handleTool('derive_keypair', { seed }));
      const r2 = parseResult(await handleTool('derive_keypair', { seed }));
      expect(r1.publicKey).toBe(r2.publicKey);
      expect(r1.secretKey).toBe(r2.secretKey);
    });
  });

  // ── encrypt / decrypt ──────────────────────────────────────────────

  describe('encrypt / decrypt', () => {
    it('roundtrip: decrypt recovers original message', async () => {
      const sender = parseResult(await handleTool('generate_keypair', {}));
      const recipient = parseResult(await handleTool('generate_keypair', {}));
      const message = Buffer.from('hello world').toString('base64');

      const encrypted = parseResult(
        await handleTool('encrypt', {
          message,
          recipientPublicKey: recipient.publicKey,
          senderSecretKey: sender.secretKey,
          senderPublicKey: sender.publicKey,
        }),
      );
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.bytes).toBeDefined();

      const decrypted = parseResult(
        await handleTool('decrypt', {
          encrypted: encrypted.bytes,
          senderPublicKey: sender.publicKey,
          recipientSecretKey: recipient.secretKey,
          recipientPublicKey: recipient.publicKey,
        }),
      );
      expect(Buffer.from(decrypted.plaintext, 'base64').toString()).toBe('hello world');
    });
  });

  // ── encrypt_multiple ────────────────────────────────────────────────

  describe('encrypt_multiple', () => {
    it('returns recipientCount and recipients map', async () => {
      const sender = parseResult(await handleTool('generate_keypair', {}));
      const r1 = parseResult(await handleTool('generate_keypair', {}));
      const r2 = parseResult(await handleTool('generate_keypair', {}));
      const message = Buffer.from('shared secret').toString('base64');

      const result = parseResult(
        await handleTool('encrypt_multiple', {
          message,
          recipientPublicKeys: [r1.publicKey, r2.publicKey],
          senderSecretKey: sender.secretKey,
          senderPublicKey: sender.publicKey,
        }),
      );
      expect(result.recipientCount).toBe(2);
      expect(Object.keys(result.recipients).length).toBe(2);
    });
  });

  // ── validate_encrypted ──────────────────────────────────────────────

  describe('validate_encrypted', () => {
    it('returns valid: true for properly encrypted data', async () => {
      const sender = parseResult(await handleTool('generate_keypair', {}));
      const recipient = parseResult(await handleTool('generate_keypair', {}));
      const message = Buffer.from('test').toString('base64');

      const encrypted = parseResult(
        await handleTool('encrypt', {
          message,
          recipientPublicKey: recipient.publicKey,
          senderSecretKey: sender.secretKey,
          senderPublicKey: sender.publicKey,
        }),
      );

      const result = parseResult(
        await handleTool('validate_encrypted', { data: encrypted.bytes }),
      );
      expect(result.valid).toBe(true);
      expect(result.byteLength).toBeGreaterThan(0);
    });
  });

  // ── key_convert ─────────────────────────────────────────────────────

  describe('key_convert', () => {
    it('base64 → base58 and back', async () => {
      const kp = parseResult(await handleTool('generate_keypair', {}));

      // base64 → base58
      const r1 = parseResult(await handleTool('key_convert', { publicKey: kp.publicKey }));
      expect(r1.base58).toBeDefined();

      // base58 → base64
      const r2 = parseResult(await handleTool('key_convert', { base58: r1.base58 }));
      expect(r2.publicKey).toBe(kp.publicKey);
    });
  });

  // ── shamir_split / shamir_combine ──────────────────────────────────

  describe('shamir_split / shamir_combine', () => {
    it('roundtrip: split then combine recovers original secret', async () => {
      const secret = randomSeed();

      const splitResult = parseResult(
        await handleTool('shamir_split', { secret, totalShares: 5, threshold: 3 }),
      );
      expect(splitResult.shares.length).toBe(5);
      expect(splitResult.threshold).toBe(3);
      expect(splitResult.totalShares).toBe(5);

      const combineResult = parseResult(
        await handleTool('shamir_combine', {
          shares: splitResult.shares.slice(0, 3),
        }),
      );
      expect(combineResult.secret).toBe(secret);
    });
  });

  // ── shamir_verify ──────────────────────────────────────────────────

  describe('shamir_verify', () => {
    it('returns valid: true for consistent shares', async () => {
      const secret = randomSeed();
      const splitResult = parseResult(
        await handleTool('shamir_split', { secret, totalShares: 5, threshold: 3 }),
      );

      const verifyResult = parseResult(
        await handleTool('shamir_verify', {
          shares: splitResult.shares,
          threshold: 3,
        }),
      );
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.sharesProvided).toBe(5);
      expect(verifyResult.threshold).toBe(3);
    });
  });

  // ── encrypt_order / decrypt_order ──────────────────────────────────

  describe('encrypt_order / decrypt_order', () => {
    it('roundtrip preserves order fields', async () => {
      const user = parseResult(await handleTool('generate_keypair', {}));
      const solver = parseResult(await handleTool('generate_keypair', {}));

      const encrypted = parseResult(
        await handleTool('encrypt_order', {
          minOutputAmount: '1000000000',
          slippageBps: 50,
          deadline: 1700000000,
          solverPublicKey: solver.publicKey,
          userSecretKey: user.secretKey,
          userPublicKey: user.publicKey,
        }),
      );
      expect(encrypted.bytes).toBeDefined();
      expect(encrypted.payloadHash).toBeDefined();
      expect(encrypted.userPublicKey).toBeDefined();

      const decrypted = parseResult(
        await handleTool('decrypt_order', {
          encrypted: encrypted.bytes,
          userPublicKey: user.publicKey,
          solverSecretKey: solver.secretKey,
          solverPublicKey: solver.publicKey,
        }),
      );
      expect(decrypted.minOutputAmount).toBe('1000000000');
      expect(decrypted.slippageBps).toBe(50);
      expect(decrypted.deadline).toBe(1700000000);
    });
  });

  // ── unknown tool ────────────────────────────────────────────────────

  describe('unknown tool', () => {
    it('rejects for an unrecognized tool name', async () => {
      await expect(handleTool('nonexistent_tool', {})).rejects.toThrow('Unknown tool: nonexistent_tool');
    });
  });
});

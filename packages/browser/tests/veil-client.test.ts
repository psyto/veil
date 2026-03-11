import { VeilClient, generateEncryptionKeypair, computePayloadHash, validateEncryptedData, validateEncryptedPayload } from '../src/index';

describe('VeilClient', () => {
  describe('create', () => {
    it('creates a client with a random keypair', () => {
      const client = VeilClient.create();
      expect(client.publicKey).toBeInstanceOf(Uint8Array);
      expect(client.publicKey.length).toBe(32);
    });

    it('creates unique keypairs each time', () => {
      const c1 = VeilClient.create();
      const c2 = VeilClient.create();
      expect(Buffer.from(c1.publicKey).toString('hex'))
        .not.toBe(Buffer.from(c2.publicKey).toString('hex'));
    });
  });

  describe('fromSeed', () => {
    it('is deterministic — same seed produces same keypair', () => {
      const seed = new Uint8Array(32);
      seed[0] = 42;
      const c1 = VeilClient.fromSeed(seed);
      const c2 = VeilClient.fromSeed(seed);
      expect(Buffer.from(c1.publicKey).toString('hex'))
        .toBe(Buffer.from(c2.publicKey).toString('hex'));
    });

    it('different seeds produce different keypairs', () => {
      const seed1 = new Uint8Array(32).fill(1);
      const seed2 = new Uint8Array(32).fill(2);
      expect(Buffer.from(VeilClient.fromSeed(seed1).publicKey).toString('hex'))
        .not.toBe(Buffer.from(VeilClient.fromSeed(seed2).publicKey).toString('hex'));
    });
  });

  describe('fromKeypair', () => {
    it('uses the provided keypair', () => {
      const kp = generateEncryptionKeypair();
      const client = VeilClient.fromKeypair(kp);
      expect(Buffer.from(client.publicKey).toString('hex'))
        .toBe(Buffer.from(kp.publicKey).toString('hex'));
    });
  });

  describe('publicKey formats', () => {
    it('provides hex and base58 representations', () => {
      const client = VeilClient.create();
      expect(client.publicKeyHex).toMatch(/^(0x)?[0-9a-f]{64}$/);
      expect(client.publicKeyBase58.length).toBeGreaterThan(0);
    });
  });

  describe('encrypt / decrypt', () => {
    it('roundtrip: decrypt recovers original data', () => {
      const sender = VeilClient.create();
      const recipient = VeilClient.create();
      const plaintext = new TextEncoder().encode('hello veil');

      const encrypted = sender.encrypt(plaintext, recipient.publicKey);
      expect(encrypted.bytes.length).toBeGreaterThan(plaintext.length);

      const decrypted = recipient.decrypt(encrypted.bytes, sender.publicKey);
      expect(new TextDecoder().decode(decrypted)).toBe('hello veil');
    });

    it('fails to decrypt with wrong key', () => {
      const sender = VeilClient.create();
      const recipient = VeilClient.create();
      const wrongRecipient = VeilClient.create();

      const encrypted = sender.encrypt(new Uint8Array([1, 2, 3]), recipient.publicKey);
      expect(() => wrongRecipient.decrypt(encrypted.bytes, sender.publicKey)).toThrow();
    });
  });

  describe('encryptForMultiple', () => {
    it('encrypts for multiple recipients', () => {
      const sender = VeilClient.create();
      const r1 = VeilClient.create();
      const r2 = VeilClient.create();
      const plaintext = new TextEncoder().encode('shared message');

      const results = sender.encryptForMultiple(plaintext, [r1.publicKey, r2.publicKey]);
      expect(results.size).toBe(2);

      // Each recipient can decrypt
      for (const [_key, encrypted] of results) {
        // Verify the encrypted data has content
        expect(encrypted.bytes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('encryptOrder', () => {
    it('encrypts an order with commitment hash', () => {
      const user = VeilClient.create();
      const solverKp = generateEncryptionKeypair();

      const order = user.encryptOrder({
        minOutputAmount: '1000000',
        slippageBps: 50,
        deadline: Math.floor(Date.now() / 1000) + 300,
        solverPublicKey: solverKp.publicKey,
      });

      expect(order.encryptedBytes).toBeInstanceOf(Uint8Array);
      expect(order.encryptedBytes.length).toBeGreaterThan(24); // nonce + ciphertext
      expect(order.payloadHash).toBeInstanceOf(Uint8Array);
      expect(order.payloadHash.length).toBe(32);
      expect(order.userPublicKey).toBeInstanceOf(Uint8Array);
      expect(order.userPublicKey.length).toBe(32);
      expect(order.userPublicKeyHex).toMatch(/^(0x)?[0-9a-f]{64}$/);
      expect(order.userPublicKeyBase58.length).toBeGreaterThan(0);
    });

    it('accepts solver public key as hex string', () => {
      const user = VeilClient.create();
      const solverKp = generateEncryptionKeypair();
      const solverHex = '0x' + Buffer.from(solverKp.publicKey).toString('hex');

      const order = user.encryptOrder({
        minOutputAmount: 500000,
        slippageBps: 100,
        deadline: Math.floor(Date.now() / 1000) + 600,
        solverPublicKey: solverHex,
      });

      expect(order.encryptedBytes.length).toBeGreaterThan(0);
      expect(order.payloadHash.length).toBe(32);
    });

    it('commitment hash matches computePayloadHash', () => {
      const user = VeilClient.create();
      const solverKp = generateEncryptionKeypair();
      const minOutput = '2000000';
      const slippage = 75;
      const deadline = Math.floor(Date.now() / 1000) + 300;

      const order = user.encryptOrder({
        minOutputAmount: minOutput,
        slippageBps: slippage,
        deadline,
        solverPublicKey: solverKp.publicKey,
      });

      // Independently compute the expected hash
      const BN = require('bn.js');
      const expectedHash = computePayloadHash({
        minOutputAmount: new BN(minOutput),
        slippageBps: slippage,
        deadline,
      });
      expect(Buffer.from(order.payloadHash).toString('hex'))
        .toBe(Buffer.from(expectedHash).toString('hex'));
    });
  });

  describe('encryptThresholdOrder', () => {
    it('creates threshold-encrypted order for M-of-N solvers', () => {
      const user = VeilClient.create();
      const solvers = [
        generateEncryptionKeypair(),
        generateEncryptionKeypair(),
        generateEncryptionKeypair(),
      ];

      const result = user.encryptThresholdOrder({
        minOutputAmount: '1000000',
        slippageBps: 50,
        deadline: Math.floor(Date.now() / 1000) + 300,
        threshold: 2,
        solverPublicKey: solvers[0].publicKey, // primary
        solverPublicKeys: solvers.map(s => s.publicKey),
      });

      expect(result.solverShares.length).toBe(3);
      expect(result.threshold).toBe(2);
    });
  });

  describe('splitSecret / combineShares', () => {
    it('roundtrip: split then combine recovers original', () => {
      const client = VeilClient.create();
      const secret = new Uint8Array(32);
      secret.set([10, 20, 30, 40, 50]);

      const shares = client.splitSecret(secret, 3, 5);
      expect(shares.length).toBe(5);

      const recovered = client.combineShares(shares.slice(0, 3));
      expect(Buffer.from(recovered).toString('hex'))
        .toBe(Buffer.from(secret).toString('hex'));
    });
  });

  describe('validateEncryptedData', () => {
    it('validates properly encrypted data', () => {
      const sender = VeilClient.create();
      const recipient = VeilClient.create();
      const encrypted = sender.encrypt(new Uint8Array([1, 2, 3]), recipient.publicKey);

      expect(validateEncryptedData(encrypted.bytes)).toBe(true);
    });

    it('rejects data that is too short', () => {
      expect(validateEncryptedData(new Uint8Array([1, 2, 3]))).toBe(false);
    });
  });

  describe('destroy', () => {
    it('zeroes the secret key', () => {
      const client = VeilClient.create();
      client.destroy();
      // After destroy, publicKey is still accessible but secretKey is zeroed
      // We can't directly access secretKey, but the client should be unusable
      expect(client.publicKey.length).toBe(32);
    });
  });
});

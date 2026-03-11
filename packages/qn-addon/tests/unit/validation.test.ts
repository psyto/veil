import * as cryptoService from '../../src/services/crypto-service';
import * as ordersService from '../../src/services/orders-service';

describe('validation', () => {
  describe('encrypted data validation', () => {
    it('validates properly encrypted data', () => {
      const sender = cryptoService.generate();
      const recipient = cryptoService.generate();
      const plaintext = new Uint8Array(Buffer.from('test data'));

      const encrypted = cryptoService.encryptData(plaintext, recipient.publicKey, sender);

      // NaCl box minimum: 24 (nonce) + 16 (auth tag) + 1 (min data) = 41
      expect(encrypted.bytes.length).toBeGreaterThanOrEqual(41);
      expect(encrypted.nonce.length).toBe(24);
      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    });

    it('decrypts with wrong key throws', () => {
      const sender = cryptoService.generate();
      const recipient = cryptoService.generate();
      const wrongRecipient = cryptoService.generate();

      const encrypted = cryptoService.encryptData(
        new Uint8Array([1, 2, 3]),
        recipient.publicKey,
        sender,
      );

      expect(() =>
        cryptoService.decryptData(encrypted.bytes, sender.publicKey, wrongRecipient)
      ).toThrow();
    });
  });

  describe('order validation', () => {
    it('validates encrypted order structure', () => {
      const user = cryptoService.generate();
      const solver = cryptoService.generate();

      const encrypted = ordersService.encryptOrder(
        { minOutputAmount: '500000', slippageBps: 100, deadline: 1800000000 },
        solver.publicKey,
        user,
      );

      const valid = ordersService.validateOrder(encrypted.bytes);
      expect(valid).toBe(true);
    });

    it('rejects invalid order bytes', () => {
      const valid = ordersService.validateOrder(new Uint8Array([1, 2, 3]));
      expect(valid).toBe(false);
    });
  });

  describe('multi-recipient encryption', () => {
    it('encrypts for multiple recipients', () => {
      const sender = cryptoService.generate();
      const recipients = [
        cryptoService.generate(),
        cryptoService.generate(),
        cryptoService.generate(),
      ];
      const plaintext = new Uint8Array(Buffer.from('shared secret'));

      const results = cryptoService.encryptMultiple(
        plaintext,
        recipients.map(r => r.publicKey),
        sender,
      );

      expect(results.size).toBe(3);
      for (const [_key, encrypted] of results) {
        expect(encrypted.bytes.length).toBeGreaterThan(0);
      }
    });
  });
});

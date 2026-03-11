import {
  createEphemeralWallet,
  EphemeralWalletManager,
} from '../src/lib/shadow/ephemeral';

describe('ephemeral wallet', () => {
  describe('createEphemeralWallet', () => {
    it('creates a wallet with a valid keypair', () => {
      const wallet = createEphemeralWallet();
      expect(wallet.keypair).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.publicKey.toBase58().length).toBeGreaterThan(0);
      expect(wallet.createdAt).toBeGreaterThan(0);
    });

    it('creates unique wallets each time', () => {
      const w1 = createEphemeralWallet();
      const w2 = createEphemeralWallet();
      expect(w1.publicKey.toBase58()).not.toBe(w2.publicKey.toBase58());
    });

    it('accepts an optional label', () => {
      const wallet = createEphemeralWallet('test-label');
      expect(wallet.label).toBe('test-label');
    });
  });

  describe('EphemeralWalletManager', () => {
    let manager: EphemeralWalletManager;

    beforeEach(() => {
      manager = new EphemeralWalletManager();
    });

    it('starts empty', () => {
      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });

    it('creates and tracks wallets', () => {
      const w1 = manager.create('first');
      const w2 = manager.create('second');

      expect(manager.count()).toBe(2);
      expect(manager.get(w1.publicKey.toBase58())).toBe(w1);
      expect(manager.get(w2.publicKey.toBase58())).toBe(w2);
    });

    it('lists all tracked wallets', () => {
      manager.create();
      manager.create();
      manager.create();

      expect(manager.list().length).toBe(3);
    });

    it('removes a wallet by public key', () => {
      const wallet = manager.create();
      expect(manager.remove(wallet.publicKey.toBase58())).toBe(true);
      expect(manager.count()).toBe(0);
    });

    it('returns false when removing nonexistent wallet', () => {
      expect(manager.remove('nonexistent')).toBe(false);
    });

    it('clears all wallets', () => {
      manager.create();
      manager.create();
      manager.clear();
      expect(manager.count()).toBe(0);
    });
  });
});

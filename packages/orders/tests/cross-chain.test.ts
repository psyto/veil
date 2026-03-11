import BN from 'bn.js';
import { createHash } from 'crypto';
import {
  serializeOrderPayload,
  computePayloadHash,
  createCommittedEncryptedOrder,
  decryptOrderPayload,
  generateEncryptionKeypair,
} from '../src/index';

/**
 * Cross-chain integration tests.
 *
 * Verify that the commitment hash scheme produces identical results
 * to the Solidity contract's executeOrder payload reconstruction.
 * The Solidity contract serializes: minOutputAmount(u64 LE, 8) + slippageBps(u16 LE, 2)
 * + deadline(i64 LE, 8) + padding(6 zeros) = 24 bytes, then sha256().
 *
 * These tests ensure the TypeScript serialization matches exactly,
 * so a commitment hash computed client-side will verify on both Solana and EVM.
 */
describe('cross-chain commitment hash compatibility', () => {
  it('serialized payload matches EVM contract layout (24 bytes LE)', () => {
    const payload = {
      minOutputAmount: new BN('95000000'),
      slippageBps: 50,
      deadline: 1700000000,
    };
    const serialized = serializeOrderPayload(payload);
    expect(serialized.length).toBe(24);

    // Manually reconstruct expected bytes (matching Solidity layout)
    const expected = Buffer.alloc(24);
    expected.writeBigUInt64LE(95000000n, 0);  // minOutputAmount u64 LE
    expected.writeUInt16LE(50, 8);             // slippageBps u16 LE
    expected.writeBigInt64LE(1700000000n, 10); // deadline i64 LE
    // bytes 18-23 are zero (padding)

    expect(Buffer.from(serialized).toString('hex')).toBe(expected.toString('hex'));
  });

  it('SHA-256 of serialized payload matches manual computation', () => {
    const payload = {
      minOutputAmount: new BN('95000000'),
      slippageBps: 50,
      deadline: 1700000000,
    };

    const hash = computePayloadHash(payload);

    // Manual: serialize then SHA-256
    const buf = Buffer.alloc(24);
    buf.writeBigUInt64LE(95000000n, 0);
    buf.writeUInt16LE(50, 8);
    buf.writeBigInt64LE(1700000000n, 10);
    const expectedHash = createHash('sha256').update(buf).digest();

    expect(Buffer.from(hash).toString('hex')).toBe(expectedHash.toString('hex'));
  });

  it('encrypt → decrypt → reserialize → hash matches (full round-trip)', () => {
    const user = generateEncryptionKeypair();
    const solver = generateEncryptionKeypair();

    const committed = createCommittedEncryptedOrder(
      '48000000',
      100,
      1710000000,
      solver.publicKey,
      user,
    );

    // Solver decrypts
    const decrypted = decryptOrderPayload(committed.encryptedBytes, user.publicKey, solver);

    // Solver reconstructs the 24-byte payload (same as Solidity executeOrder does)
    const reconstructed = Buffer.alloc(24);
    reconstructed.writeBigUInt64LE(BigInt(decrypted.minOutputAmount.toString()), 0);
    reconstructed.writeUInt16LE(decrypted.slippageBps, 8);
    reconstructed.writeBigInt64LE(BigInt(decrypted.deadline), 10);

    const reconstructedHash = createHash('sha256').update(reconstructed).digest();

    // This is the check both Solana and EVM programs perform on-chain
    expect(Buffer.from(reconstructedHash).toString('hex')).toBe(
      Buffer.from(committed.payloadHash).toString('hex')
    );
  });

  it('commitment hash is sensitive to every field', () => {
    const base = {
      minOutputAmount: new BN('1000000'),
      slippageBps: 50,
      deadline: 1700000000,
    };

    const hashBase = computePayloadHash(base);

    // Change minOutputAmount
    const h1 = computePayloadHash({ ...base, minOutputAmount: new BN('1000001') });
    expect(Buffer.from(h1).toString('hex')).not.toBe(Buffer.from(hashBase).toString('hex'));

    // Change slippageBps
    const h2 = computePayloadHash({ ...base, slippageBps: 51 });
    expect(Buffer.from(h2).toString('hex')).not.toBe(Buffer.from(hashBase).toString('hex'));

    // Change deadline
    const h3 = computePayloadHash({ ...base, deadline: 1700000001 });
    expect(Buffer.from(h3).toString('hex')).not.toBe(Buffer.from(hashBase).toString('hex'));
  });

  it('zero-value payload hashes correctly', () => {
    const payload = {
      minOutputAmount: new BN(0),
      slippageBps: 0,
      deadline: 0,
    };
    const hash = computePayloadHash(payload);
    expect(hash.length).toBe(32);

    // SHA-256 of 24 zero bytes
    const expected = createHash('sha256').update(Buffer.alloc(24)).digest();
    expect(Buffer.from(hash).toString('hex')).toBe(expected.toString('hex'));
  });

  it('large-value payload hashes correctly', () => {
    // Large but JS-safe values
    const payload = {
      minOutputAmount: new BN('18446744073709551615'), // u64 max
      slippageBps: 65535, // u16 max
      deadline: 2147483647, // i32 max (safe for JS number serialization)
    };
    const hash = computePayloadHash(payload);
    expect(hash.length).toBe(32);
  });
});

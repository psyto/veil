import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { generateEncryptionKeypair } from '@veil/core';
import {
  createEncryptedOrder,
  decryptOrderPayload,
  PROGRAM_ID,
  TIER_CONFIG_SEED,
  ORDER_SEED,
  ORDER_VAULT_SEED,
  OUTPUT_VAULT_SEED,
  FEE_VAULT_SEED,
  OrderStatus,
  OrderType,
  MevProtectionLevel,
} from '../src/index';
import {
  MAX_FEE_BPS,
  MIN_FEE_BPS,
  MIN_PAYLOAD_SIZE,
  MAX_PAYLOAD_SIZE,
  MAX_FAIRSCORE,
  NUM_TIERS,
  MAX_PROOF_AGE_SECONDS,
  ORDER_TYPE_MARKET,
  ORDER_TYPE_LIMIT,
  ORDER_TYPE_TWAP,
  ORDER_TYPE_ICEBERG,
  ORDER_TYPE_DARK,
} from '../src/constants';

// ============================================================================
// 1. Constants
// ============================================================================

describe('constants', () => {
  it('PROGRAM_ID is a valid PublicKey', () => {
    expect(PROGRAM_ID).toBeInstanceOf(PublicKey);
    expect(PROGRAM_ID.toBase58()).toBe('CqcA7CXYLLGcGCSTYPbN8iKruXJu38kZNciH86CVhewr');
  });

  it('PDA seed buffers contain the correct strings', () => {
    expect(TIER_CONFIG_SEED.toString()).toBe('tier_config');
    expect(ORDER_SEED.toString()).toBe('tiered_order');
    expect(ORDER_VAULT_SEED.toString()).toBe('order_vault');
    expect(OUTPUT_VAULT_SEED.toString()).toBe('output_vault');
    expect(FEE_VAULT_SEED.toString()).toBe('fee_vault');
  });

  it('constraint constants have expected values', () => {
    expect(MAX_FEE_BPS).toBe(500);
    expect(MIN_FEE_BPS).toBe(1);
    expect(MIN_PAYLOAD_SIZE).toBe(24);
    expect(MAX_PAYLOAD_SIZE).toBe(128);
    expect(MAX_FAIRSCORE).toBe(100);
    expect(NUM_TIERS).toBe(5);
    expect(MAX_PROOF_AGE_SECONDS).toBe(600);
  });

  it('order type bitmasks are powers of two', () => {
    expect(ORDER_TYPE_MARKET).toBe(1);
    expect(ORDER_TYPE_LIMIT).toBe(2);
    expect(ORDER_TYPE_TWAP).toBe(4);
    expect(ORDER_TYPE_ICEBERG).toBe(8);
    expect(ORDER_TYPE_DARK).toBe(16);
  });

  it('bitmasks are composable (bitwise OR)', () => {
    const marketAndLimit = ORDER_TYPE_MARKET | ORDER_TYPE_LIMIT;
    expect(marketAndLimit).toBe(3);
    expect(marketAndLimit & ORDER_TYPE_MARKET).toBeTruthy();
    expect(marketAndLimit & ORDER_TYPE_LIMIT).toBeTruthy();
    expect(marketAndLimit & ORDER_TYPE_TWAP).toBeFalsy();
  });
});

// ============================================================================
// 2. Enum values
// ============================================================================

describe('enum values', () => {
  it('OrderStatus members match expected strings', () => {
    expect(OrderStatus.Pending).toBe('pending');
    expect(OrderStatus.Executing).toBe('executing');
    expect(OrderStatus.Completed).toBe('completed');
    expect(OrderStatus.Cancelled).toBe('cancelled');
    expect(OrderStatus.Failed).toBe('failed');
  });

  it('OrderType members match expected strings', () => {
    expect(OrderType.Market).toBe('market');
    expect(OrderType.Limit).toBe('limit');
    expect(OrderType.Twap).toBe('twap');
    expect(OrderType.Iceberg).toBe('iceberg');
    expect(OrderType.Dark).toBe('dark');
  });

  it('MevProtectionLevel members match expected strings', () => {
    expect(MevProtectionLevel.None).toBe('none');
    expect(MevProtectionLevel.Basic).toBe('basic');
    expect(MevProtectionLevel.Full).toBe('full');
    expect(MevProtectionLevel.Priority).toBe('priority');
  });
});

// ============================================================================
// 3. Encryption roundtrip
// ============================================================================

describe('encryption roundtrip', () => {
  const userKeypair = generateEncryptionKeypair();
  const solverKeypair = generateEncryptionKeypair();

  it('createEncryptedOrder returns a Uint8Array', () => {
    const encrypted = createEncryptedOrder(
      '1000000',
      50,
      1700000000,
      solverKeypair.publicKey,
      userKeypair,
    );
    expect(encrypted).toBeInstanceOf(Uint8Array);
    expect(encrypted.length).toBeGreaterThanOrEqual(MIN_PAYLOAD_SIZE);
    expect(encrypted.length).toBeLessThanOrEqual(MAX_PAYLOAD_SIZE);
  });

  it('encrypt then decrypt preserves minOutputAmount, slippageBps, deadline', () => {
    const minOutput = '999999999';
    const slippage = 200;
    const deadline = 1710000000;

    const encrypted = createEncryptedOrder(
      minOutput,
      slippage,
      deadline,
      solverKeypair.publicKey,
      userKeypair,
    );

    const decrypted = decryptOrderPayload(
      encrypted,
      userKeypair.publicKey,
      solverKeypair,
    );

    expect(decrypted.minOutputAmount.toString()).toBe(minOutput);
    expect(decrypted.slippageBps).toBe(slippage);
    expect(decrypted.deadline).toBe(deadline);
  });

  it('different keypairs produce different ciphertext', () => {
    const otherUser = generateEncryptionKeypair();

    const enc1 = createEncryptedOrder(
      '1000000',
      50,
      1700000000,
      solverKeypair.publicKey,
      userKeypair,
    );
    const enc2 = createEncryptedOrder(
      '1000000',
      50,
      1700000000,
      solverKeypair.publicKey,
      otherUser,
    );

    expect(Buffer.from(enc1).toString('hex')).not.toBe(
      Buffer.from(enc2).toString('hex'),
    );
  });
});

// ============================================================================
// 4. PDA derivation is deterministic
// ============================================================================

describe('PDA derivation', () => {
  it('tier_config PDA is deterministic', () => {
    const [pda1, bump1] = PublicKey.findProgramAddressSync(
      [TIER_CONFIG_SEED],
      PROGRAM_ID,
    );
    const [pda2, bump2] = PublicKey.findProgramAddressSync(
      [TIER_CONFIG_SEED],
      PROGRAM_ID,
    );
    expect(pda1.equals(pda2)).toBe(true);
    expect(bump1).toBe(bump2);
  });

  it('tiered_order PDA is deterministic given the same order id', () => {
    const orderId = new BN(42);
    const orderIdBuffer = orderId.toArrayLike(Buffer, 'le', 8);

    const [pda1] = PublicKey.findProgramAddressSync(
      [ORDER_SEED, orderIdBuffer],
      PROGRAM_ID,
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [ORDER_SEED, orderIdBuffer],
      PROGRAM_ID,
    );
    expect(pda1.equals(pda2)).toBe(true);
  });

  it('different order ids produce different PDAs', () => {
    const id1 = new BN(1).toArrayLike(Buffer, 'le', 8);
    const id2 = new BN(2).toArrayLike(Buffer, 'le', 8);

    const [pda1] = PublicKey.findProgramAddressSync(
      [ORDER_SEED, id1],
      PROGRAM_ID,
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [ORDER_SEED, id2],
      PROGRAM_ID,
    );
    expect(pda1.equals(pda2)).toBe(false);
  });

  it('vault PDAs are deterministic', () => {
    const mint = PublicKey.default;

    const [orderVault1] = PublicKey.findProgramAddressSync(
      [ORDER_VAULT_SEED, mint.toBuffer()],
      PROGRAM_ID,
    );
    const [orderVault2] = PublicKey.findProgramAddressSync(
      [ORDER_VAULT_SEED, mint.toBuffer()],
      PROGRAM_ID,
    );
    expect(orderVault1.equals(orderVault2)).toBe(true);

    const [outputVault1] = PublicKey.findProgramAddressSync(
      [OUTPUT_VAULT_SEED, mint.toBuffer()],
      PROGRAM_ID,
    );
    const [outputVault2] = PublicKey.findProgramAddressSync(
      [OUTPUT_VAULT_SEED, mint.toBuffer()],
      PROGRAM_ID,
    );
    expect(outputVault1.equals(outputVault2)).toBe(true);

    const [feeVault1] = PublicKey.findProgramAddressSync(
      [FEE_VAULT_SEED],
      PROGRAM_ID,
    );
    const [feeVault2] = PublicKey.findProgramAddressSync(
      [FEE_VAULT_SEED],
      PROGRAM_ID,
    );
    expect(feeVault1.equals(feeVault2)).toBe(true);
  });

  it('different seed types produce different PDAs', () => {
    const [tierConfig] = PublicKey.findProgramAddressSync(
      [TIER_CONFIG_SEED],
      PROGRAM_ID,
    );
    const [feeVault] = PublicKey.findProgramAddressSync(
      [FEE_VAULT_SEED],
      PROGRAM_ID,
    );
    expect(tierConfig.equals(feeVault)).toBe(false);
  });
});

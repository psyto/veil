import { PublicKey } from '@solana/web3.js';
import {
  DarkPoolOperations,
  LiquidityOperations,
  LaunchOperations,
  SwapOperations,
} from '../src/index';

// Deterministic test keys
const PROGRAM_ID = new PublicKey('8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U');
const TOKEN_A = PublicKey.unique();
const TOKEN_B = PublicKey.unique();
const OWNER = PublicKey.unique();

// ============================================================================
// DarkPoolOperations
// ============================================================================

describe('DarkPoolOperations', () => {
  describe('findPoolAddress', () => {
    it('should derive a valid PublicKey', () => {
      const pool = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B);
      expect(pool).toBeInstanceOf(PublicKey);
    });

    it('should be deterministic for the same inputs', () => {
      const pool1 = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B);
      const pool2 = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B);
      expect(pool1.equals(pool2)).toBe(true);
    });

    it('should produce different addresses for swapped token order', () => {
      const poolAB = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B);
      const poolBA = DarkPoolOperations.findPoolAddress(TOKEN_B, TOKEN_A);
      expect(poolAB.equals(poolBA)).toBe(false);
    });

    it('should accept a custom programId', () => {
      const customProgram = PublicKey.unique();
      const poolDefault = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B);
      const poolCustom = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B, customProgram);
      expect(poolDefault.equals(poolCustom)).toBe(false);
    });

    it('should match manual PDA derivation', () => {
      const [expected] = PublicKey.findProgramAddressSync(
        [Buffer.from('dark_pool'), TOKEN_A.toBuffer(), TOKEN_B.toBuffer()],
        PROGRAM_ID
      );
      const actual = DarkPoolOperations.findPoolAddress(TOKEN_A, TOKEN_B, PROGRAM_ID);
      expect(actual.equals(expected)).toBe(true);
    });
  });

  describe('calculateFee', () => {
    it('should return 0 for 0 amount', () => {
      expect(DarkPoolOperations.calculateFee(BigInt(0), 30)).toBe(BigInt(0));
    });

    it('should return 0 for 0 fee rate', () => {
      expect(DarkPoolOperations.calculateFee(BigInt(1_000_000), 0)).toBe(BigInt(0));
    });

    it('should calculate 30 bps (0.3%) correctly', () => {
      const fee = DarkPoolOperations.calculateFee(BigInt(1_000_000), 30);
      // 1_000_000 * 30 / 10000 = 3000
      expect(fee).toBe(BigInt(3000));
    });

    it('should calculate 100 bps (1%) correctly', () => {
      const fee = DarkPoolOperations.calculateFee(BigInt(10_000), 100);
      expect(fee).toBe(BigInt(100));
    });

    it('should calculate 10000 bps (100%) correctly', () => {
      const fee = DarkPoolOperations.calculateFee(BigInt(5000), 10000);
      expect(fee).toBe(BigInt(5000));
    });

    it('should truncate fractional results (integer division)', () => {
      // 7 * 30 / 10000 = 0.021 -> truncated to 0
      const fee = DarkPoolOperations.calculateFee(BigInt(7), 30);
      expect(fee).toBe(BigInt(0));
    });
  });
});

// ============================================================================
// LiquidityOperations
// ============================================================================

describe('LiquidityOperations', () => {
  describe('calculateShareForDeposit', () => {
    it('should return 10000 (100%) for an empty pool', () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1000),
        BigInt(2000),
        BigInt(0),
        BigInt(0)
      );
      expect(share).toBe(10000);
    });

    it('should return 10000 when only reserveA is zero', () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1000),
        BigInt(2000),
        BigInt(0),
        BigInt(5000)
      );
      expect(share).toBe(10000);
    });

    it('should calculate proportional share correctly', () => {
      // deposit 500 of each into pool of 1000 each -> 50% = 5000 bps
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(500),
        BigInt(500),
        BigInt(1000),
        BigInt(1000)
      );
      expect(share).toBe(5000);
    });

    it('should use the smaller ratio when deposits are imbalanced', () => {
      // ratioA = 1000 * 10000 / 10000 = 1000 bps
      // ratioB = 5000 * 10000 / 10000 = 5000 bps
      // min = 1000
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(1000),
        BigInt(5000),
        BigInt(10000),
        BigInt(10000)
      );
      expect(share).toBe(1000);
    });

    it('should return 0 for zero deposits into a non-empty pool', () => {
      const share = LiquidityOperations.calculateShareForDeposit(
        BigInt(0),
        BigInt(0),
        BigInt(10000),
        BigInt(10000)
      );
      expect(share).toBe(0);
    });
  });

  describe('findPositionAddress', () => {
    const pool = PublicKey.unique();
    const owner = PublicKey.unique();

    it('should derive a valid PublicKey', () => {
      const pos = LiquidityOperations.findPositionAddress(pool, owner, 0);
      expect(pos).toBeInstanceOf(PublicKey);
    });

    it('should be deterministic', () => {
      const pos1 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      const pos2 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      expect(pos1.equals(pos2)).toBe(true);
    });

    it('should differ by position index', () => {
      const pos0 = LiquidityOperations.findPositionAddress(pool, owner, 0);
      const pos1 = LiquidityOperations.findPositionAddress(pool, owner, 1);
      expect(pos0.equals(pos1)).toBe(false);
    });

    it('should differ by owner', () => {
      const otherOwner = PublicKey.unique();
      const posA = LiquidityOperations.findPositionAddress(pool, owner, 0);
      const posB = LiquidityOperations.findPositionAddress(pool, otherOwner, 0);
      expect(posA.equals(posB)).toBe(false);
    });

    it('should match manual PDA derivation', () => {
      const index = 42;
      const [expected] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('position'),
          pool.toBuffer(),
          owner.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(index)]).buffer)),
        ],
        PROGRAM_ID
      );
      const actual = LiquidityOperations.findPositionAddress(pool, owner, index, PROGRAM_ID);
      expect(actual.equals(expected)).toBe(true);
    });
  });
});

// ============================================================================
// LaunchOperations
// ============================================================================

describe('LaunchOperations', () => {
  describe('calculateTokensForPayment', () => {
    const initialPrice = BigInt(100); // 100 lamports per token
    const maxSupply = BigInt(1_000_000);

    describe('linear curve', () => {
      it('should return payment/initialPrice at the start (currentSold=0)', () => {
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(0),
          maxSupply,
          'linear'
        );
        // priceFactor = 10000 + 0 = 10000, effectivePrice = 100 * 10000 / 10000 = 100
        // tokens = 10000 / 100 = 100
        expect(tokens).toBe(BigInt(100));
      });

      it('should return fewer tokens as currentSold increases', () => {
        const tokensEarly = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(0),
          maxSupply,
          'linear'
        );
        const tokensLater = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(500_000), // half sold
          maxSupply,
          'linear'
        );
        expect(tokensLater).toBeLessThan(tokensEarly);
      });

      it('should halve output at half supply sold', () => {
        // At half sold: priceFactor = 10000 + 5000 = 15000
        // effectivePrice = 100 * 15000 / 10000 = 150
        // tokens = 10000 / 150 = 66
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(500_000),
          maxSupply,
          'linear'
        );
        expect(tokens).toBe(BigInt(66));
      });
    });

    describe('exponential curve', () => {
      it('should return payment/initialPrice when less than half sold', () => {
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(100_000), // 10% sold
          maxSupply,
          'exponential'
        );
        // expFactor = 1 (under half)
        expect(tokens).toBe(BigInt(10000) / initialPrice);
      });

      it('should halve output when more than half sold', () => {
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(600_000), // 60% sold, > half
          maxSupply,
          'exponential'
        );
        // expFactor = 2
        expect(tokens).toBe(BigInt(10000) / (initialPrice * BigInt(2)));
      });
    });

    describe('logarithmic curve', () => {
      it('should return payment/initialPrice regardless of sold amount', () => {
        const tokens = LaunchOperations.calculateTokensForPayment(
          BigInt(10000),
          initialPrice,
          BigInt(900_000),
          maxSupply,
          'logarithmic'
        );
        expect(tokens).toBe(BigInt(100));
      });
    });
  });
});

// ============================================================================
// SwapOperations
// ============================================================================

describe('SwapOperations', () => {
  describe('calculateExpectedOutput', () => {
    const reserveIn = BigInt(1_000_000);
    const reserveOut = BigInt(1_000_000);

    it('should return 0 for 0 input', () => {
      const output = SwapOperations.calculateExpectedOutput(BigInt(0), reserveIn, reserveOut, 30);
      expect(output).toBe(BigInt(0));
    });

    it('should return less than input for equal reserves (due to fee and slippage)', () => {
      const input = BigInt(10_000);
      const output = SwapOperations.calculateExpectedOutput(input, reserveIn, reserveOut, 30);
      expect(output).toBeLessThan(input);
      expect(output).toBeGreaterThan(BigInt(0));
    });

    it('should return more with 0 fee than with 30 bps fee', () => {
      const input = BigInt(10_000);
      const noFee = SwapOperations.calculateExpectedOutput(input, reserveIn, reserveOut, 0);
      const withFee = SwapOperations.calculateExpectedOutput(input, reserveIn, reserveOut, 30);
      expect(noFee).toBeGreaterThan(withFee);
    });

    it('should follow constant product formula', () => {
      // Manual: feeFactor = 10000 - 30 = 9970
      // numerator = 1_000_000 * 10_000 * 9970 = 99_700_000_000_000
      // denominator = 1_000_000 * 10000 + 10_000 * 9970 = 10_099_700_000
      // output = 99_700_000_000_000 / 10_099_700_000 = 9871
      const input = BigInt(10_000);
      const output = SwapOperations.calculateExpectedOutput(input, reserveIn, reserveOut, 30);
      expect(output).toBe(BigInt(9871));
    });

    it('should handle large reserves correctly', () => {
      const bigReserveIn = BigInt(1_000_000_000_000);
      const bigReserveOut = BigInt(500_000_000_000);
      const input = BigInt(1_000_000);
      const output = SwapOperations.calculateExpectedOutput(input, bigReserveIn, bigReserveOut, 30);
      expect(output).toBeGreaterThan(BigInt(0));
      expect(output).toBeLessThan(bigReserveOut);
    });
  });

  describe('calculatePriceImpact', () => {
    const reserveIn = BigInt(1_000_000);
    const reserveOut = BigInt(1_000_000);

    it('should return small impact for tiny trade relative to reserves', () => {
      const impact = SwapOperations.calculatePriceImpact(BigInt(100), reserveIn, reserveOut);
      expect(impact).toBeLessThan(2);
    });

    it('should increase with larger trade size', () => {
      const smallImpact = SwapOperations.calculatePriceImpact(BigInt(1_000), reserveIn, reserveOut);
      const largeImpact = SwapOperations.calculatePriceImpact(BigInt(100_000), reserveIn, reserveOut);
      expect(largeImpact).toBeGreaterThan(smallImpact);
    });

    it('should be positive for any non-zero trade', () => {
      const impact = SwapOperations.calculatePriceImpact(BigInt(10_000), reserveIn, reserveOut);
      expect(impact).toBeGreaterThan(0);
    });

    it('should approach but not reach 100% even for very large trades', () => {
      const impact = SwapOperations.calculatePriceImpact(BigInt(999_999), reserveIn, reserveOut);
      expect(impact).toBeLessThan(100);
      expect(impact).toBeGreaterThan(0);
    });
  });

  describe('findOrderAddress', () => {
    const pool = PublicKey.unique();
    const maker = PublicKey.unique();

    it('should derive a valid PublicKey', () => {
      const order = SwapOperations.findOrderAddress(pool, maker, 0);
      expect(order).toBeInstanceOf(PublicKey);
    });

    it('should be deterministic', () => {
      const o1 = SwapOperations.findOrderAddress(pool, maker, 0);
      const o2 = SwapOperations.findOrderAddress(pool, maker, 0);
      expect(o1.equals(o2)).toBe(true);
    });

    it('should differ by order index', () => {
      const o0 = SwapOperations.findOrderAddress(pool, maker, 0);
      const o1 = SwapOperations.findOrderAddress(pool, maker, 1);
      expect(o0.equals(o1)).toBe(false);
    });

    it('should differ by maker', () => {
      const otherMaker = PublicKey.unique();
      const oA = SwapOperations.findOrderAddress(pool, maker, 0);
      const oB = SwapOperations.findOrderAddress(pool, otherMaker, 0);
      expect(oA.equals(oB)).toBe(false);
    });

    it('should match manual PDA derivation', () => {
      const index = 7;
      const [expected] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('dark_order'),
          pool.toBuffer(),
          maker.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(index)]).buffer)),
        ],
        PROGRAM_ID
      );
      const actual = SwapOperations.findOrderAddress(pool, maker, index, PROGRAM_ID);
      expect(actual.equals(expected)).toBe(true);
    });
  });
});

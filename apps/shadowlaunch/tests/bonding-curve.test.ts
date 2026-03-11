import {
  getBondingCurveState,
  calculatePurchaseAmount,
  calculateSellAmount,
  calculateSolNeeded,
  calculateMinTokensOut,
  formatTokenPrice,
  formatMarketCap,
  isGraduated,
} from '../src/lib/pumpfun/bonding-curve';
import { PumpFunToken } from '../src/lib/pumpfun/types';

/** Helper to create a mock token with default bonding curve values */
function mockToken(overrides: Partial<PumpFunToken> = {}): PumpFunToken {
  return {
    mint: 'So11111111111111111111111111111111111111112',
    name: 'TestToken',
    symbol: 'TEST',
    description: 'A test token',
    image_uri: '',
    metadata_uri: '',
    creator: 'Creator111111111111111111111111111111111111',
    created_timestamp: Math.floor(Date.now() / 1000) - 3600,
    market_cap: 1000,
    usd_market_cap: 150000,
    complete: false,
    virtual_sol_reserves: 30,
    virtual_token_reserves: 1_073_000_000,
    ...overrides,
  };
}

describe('bonding-curve', () => {
  describe('getBondingCurveState', () => {
    it('returns correct state for initial reserves', () => {
      const token = mockToken();
      const state = getBondingCurveState(token);

      expect(state.virtualSolReserves).toBe(30);
      expect(state.virtualTokenReserves).toBe(1_073_000_000);
      expect(state.k).toBe(30 * 1_073_000_000);
      expect(state.currentPrice).toBeCloseTo(30 / 1_073_000_000, 12);
      expect(state.graduationProgress).toBeCloseTo((30 / 85) * 100, 1);
    });

    it('reports 100% graduation at threshold', () => {
      const token = mockToken({ virtual_sol_reserves: 100 });
      const state = getBondingCurveState(token);
      expect(state.graduationProgress).toBe(100);
    });
  });

  describe('calculatePurchaseAmount', () => {
    it('returns positive tokens for SOL input', () => {
      const token = mockToken();
      const result = calculatePurchaseAmount(token, 1);

      expect(result.tokenAmount).toBeGreaterThan(0n);
      expect(result.priceImpact).toBeGreaterThan(0);
      expect(result.averagePrice).toBeGreaterThan(0);
      expect(result.newPrice).toBeGreaterThan(0);
    });

    it('larger purchases have higher price impact', () => {
      const token = mockToken();
      const small = calculatePurchaseAmount(token, 0.1);
      const large = calculatePurchaseAmount(token, 10);

      expect(large.priceImpact).toBeGreaterThan(small.priceImpact);
    });

    it('buying more SOL gives more tokens (but at worse rate)', () => {
      const token = mockToken();
      const r1 = calculatePurchaseAmount(token, 1);
      const r2 = calculatePurchaseAmount(token, 2);

      expect(r2.tokenAmount).toBeGreaterThan(r1.tokenAmount);
      expect(r2.averagePrice).toBeGreaterThan(r1.averagePrice);
    });
  });

  describe('calculateSellAmount', () => {
    it('returns positive SOL for token input', () => {
      const token = mockToken();
      const result = calculateSellAmount(token, 1_000_000);

      expect(result.solAmount).toBeGreaterThan(0);
      expect(result.priceImpact).toBeLessThan(0); // negative for sells
    });
  });

  describe('calculateSolNeeded', () => {
    it('returns SOL needed for target token amount', () => {
      const token = mockToken();
      const needed = calculateSolNeeded(token, 10_000_000);

      expect(needed).toBeGreaterThan(0);
    });

    it('throws when buying more than reserves', () => {
      const token = mockToken();
      expect(() => calculateSolNeeded(token, 2_000_000_000)).toThrow(
        'Cannot buy more tokens than available in reserves',
      );
    });
  });

  describe('calculateMinTokensOut', () => {
    it('applies slippage correctly', () => {
      const expected = BigInt(1000000);
      const min = calculateMinTokensOut(expected, 500); // 5% slippage
      expect(min).toBe(BigInt(950000));
    });

    it('0 slippage returns same amount', () => {
      const expected = BigInt(1000000);
      const min = calculateMinTokensOut(expected, 0);
      expect(min).toBe(expected);
    });
  });

  describe('formatTokenPrice', () => {
    it('formats very small prices in scientific notation', () => {
      expect(formatTokenPrice(0.0000001)).toMatch(/e/);
    });

    it('formats small prices with 8 decimals', () => {
      expect(formatTokenPrice(0.0001)).toMatch(/0\.0001/);
    });

    it('formats medium prices with 6 decimals', () => {
      expect(formatTokenPrice(0.5)).toBe('0.500000');
    });

    it('formats large prices with 4 decimals', () => {
      expect(formatTokenPrice(1.5)).toBe('1.5000');
    });
  });

  describe('formatMarketCap', () => {
    it('formats millions', () => {
      expect(formatMarketCap(10000, 150)).toBe('$1.50M');
    });

    it('formats thousands', () => {
      expect(formatMarketCap(10, 150)).toBe('$1.5K');
    });

    it('formats small amounts', () => {
      expect(formatMarketCap(1, 150)).toBe('$150');
    });
  });

  describe('isGraduated', () => {
    it('returns false for active tokens', () => {
      expect(isGraduated(mockToken())).toBe(false);
    });

    it('returns true for completed tokens', () => {
      expect(isGraduated(mockToken({ complete: true }))).toBe(true);
    });
  });
});

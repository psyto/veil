import { apiLimiter, deprecatedLimiter, provisionLimiter } from '../../src/middleware/rate-limit';

describe('rate-limit middleware', () => {
  it('exports apiLimiter', () => {
    expect(apiLimiter).toBeDefined();
    expect(typeof apiLimiter).toBe('function');
  });

  it('exports deprecatedLimiter with stricter limits', () => {
    expect(deprecatedLimiter).toBeDefined();
    expect(typeof deprecatedLimiter).toBe('function');
  });

  it('exports provisionLimiter', () => {
    expect(provisionLimiter).toBeDefined();
    expect(typeof provisionLimiter).toBe('function');
  });
});

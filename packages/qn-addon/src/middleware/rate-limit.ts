import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

/**
 * Stricter rate limiter for deprecated secret-handling endpoints.
 * These endpoints (/v1/encrypt, /v1/decrypt, /v1/orders/encrypt, /v1/orders/decrypt,
 * /v1/crypto/encrypt-multiple) are being phased out in favor of client-side encryption.
 */
export const deprecatedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded for deprecated endpoint. Please migrate to client-side encryption via @veil/core.',
  },
});

export const provisionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many provisioning requests, please try again later.' },
});

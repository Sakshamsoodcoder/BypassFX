/**
 * BypassFX — Rate Limiter Middleware
 * Protects auth endpoints against brute-force attacks.
 */

const rateLimit = require('express-rate-limit');

/** General API rate limiter (100 requests / 15 minutes) */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});

/** Strict limiter for auth endpoints (10 attempts / 15 minutes) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

module.exports = { apiLimiter, authLimiter };

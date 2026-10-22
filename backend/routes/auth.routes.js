/**
 * BypassFX — Auth Routes
 * POST /api/auth/signup
 * POST /api/auth/login
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 */

const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const { authLimiter } = require('../middleware/rateLimiter');
const { signup, login, forgotPassword, resetPassword } = require('../controllers/auth.controller');

// ─── Validation Rules ─────────────────────────────────────────────────────────
const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail()
];

const resetRules = [
  body('email').isEmail().normalizeEmail(),
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

// ─── Middleware: check express-validator errors ───────────────────────────────
const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

// ─── Routes ──────────────────────────────────────────────────────────────────
router.post('/signup',          authLimiter, signupRules,  validate, signup);
router.post('/login',           authLimiter, loginRules,   validate, login);
router.post('/forgot-password', authLimiter, forgotRules,  validate, forgotPassword);
router.post('/reset-password',  authLimiter, resetRules,   validate, resetPassword);

module.exports = router;

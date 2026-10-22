/**
 * BypassFX — Auth Controller
 * Handles: signup, login, forgot-password, reset-password
 */

const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');

// ─── Helper: sign JWT ─────────────────────────────────────────────────────────
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// ─── Helper: send token response ─────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON()
  });
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    // Create user — pre-save hook will hash the password
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password  // passed as plain text; hook hashes it
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }
    res.status(500).json({ success: false, message: 'Server error during signup. Please try again.' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select passwordHash (excluded by default in model)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please sign up.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Step 1: verify email exists and return a short-lived reset token
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Always return 200 to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset token has been issued.'
      });
    }

    // Generate a random 6-digit OTP / 32-byte hex token
    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F8B2C1"
    user.resetToken       = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    // In a production app you would email this token.
    // For now, return it directly (dev mode) so the frontend can use it.
    return res.status(200).json({
      success: true,
      message: 'Reset token issued. Use it within 15 minutes.',
      resetToken, // ← remove this in production; send via email instead
      email: user.email
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Step 2: verify token + set new password
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    const user = await User.findOne({
      email:            email.toLowerCase().trim(),
      resetToken:       resetToken.toUpperCase(),
      resetTokenExpiry: { $gt: new Date() }
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new one.'
      });
    }

    // Update password (pre-save hook will hash)
    user.passwordHash     = newPassword;
    user.resetToken       = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

module.exports = { signup, login, forgotPassword, resetPassword };

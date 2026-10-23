/**
 * BypassFX — Auth Controller
 * Handles: signup, login, forgot-password, reset-password, googleAuth, getGoogleConfig
 */

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User.model');
const { isDBConnected } = require('../config/db');

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

// ─── GET /api/auth/google/config ─────────────────────────────────────────────
const getGoogleConfig = (req, res) => {
  res.status(200).json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  });
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please make sure MongoDB is running.'
    });
  }

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
    if (err.name === 'MongooseServerSelectionError' || err.name === 'MongooseError') {
      return res.status(503).json({
        success: false,
        message: 'Cannot reach MongoDB cluster. Please check MongoDB connection.'
      });
    }
    res.status(500).json({ success: false, message: err.message || 'Server error during signup. Please try again.' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please make sure MongoDB is running.'
    });
  }

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

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created with Google Sign-In. Please click "Continue with Google" to log in.'
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
    if (err.name === 'MongooseServerSelectionError' || err.name === 'MongooseError') {
      return res.status(503).json({
        success: false,
        message: 'Cannot reach MongoDB cluster. Please check MongoDB connection.'
      });
    }
    res.status(500).json({ success: false, message: err.message || 'Server error during login. Please try again.' });
  }
};

// ─── POST /api/auth/google ────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please make sure MongoDB is running.'
    });
  }

  try {
    const { credential, idToken, email: rawEmail, name: rawName, googleId: rawGoogleId, avatar: rawAvatar } = req.body;
    let email = rawEmail;
    let name = rawName;
    let googleId = rawGoogleId;
    let avatar = rawAvatar || '';

    // If an ID token / credential was passed from Google Identity Services
    if (credential || idToken) {
      const token = credential || idToken;
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            console.warn(`Google token aud mismatch: ${payload.aud} vs ${process.env.GOOGLE_CLIENT_ID}`);
          }
          email = payload.email;
          name = payload.name || payload.given_name || (email ? email.split('@')[0] : 'Google User');
          googleId = payload.sub;
          avatar = payload.picture || '';
        } else {
          console.warn('Google tokeninfo returned status:', verifyRes.status);
          if (!email) {
            return res.status(401).json({
              success: false,
              message: 'Invalid Google credential token.'
            });
          }
        }
      } catch (fetchErr) {
        console.warn('Google token verification fetch notice:', fetchErr.message);
        if (!email) {
          return res.status(500).json({
            success: false,
            message: 'Unable to reach Google verification service.'
          });
        }
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required for Google authentication.'
      });
    }

    email = email.toLowerCase().trim();
    if (!name) name = email.split('@')[0];
    if (!googleId) googleId = 'g_' + crypto.createHash('sha256').update(email).digest('hex').slice(0, 20);

    // Look for existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email }]
    });

    if (user) {
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        authProvider: 'google'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error during Google authentication.'
    });
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Step 1: verify email exists and return a short-lived reset token
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset token has been issued.'
      });
    }

    // Generate a random token
    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F8B2C1"
    user.resetToken       = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Reset token issued. Use it within 15 minutes.',
      resetToken,
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

module.exports = {
  signup,
  login,
  googleAuth,
  getGoogleConfig,
  forgotPassword,
  resetPassword
};

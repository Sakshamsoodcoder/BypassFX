/**
 * BypassFX — User Controller
 * Handles: get profile, update profile, delete account
 */

const User       = require('../models/User.model');
const Conversion = require('../models/Conversion.model');

// ─── GET /api/user/me ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // req.user is already populated by protect middleware
    const stats = await Conversion.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalConversions: { $sum: 1 },
          totalSavings:     { $sum: '$savings' }
        }
      }
    ]);

    const summary = stats[0] || { totalConversions: 0, totalSavings: 0 };

    res.status(200).json({
      success: true,
      user: {
        ...req.user.toObject(),
        totalConversions: summary.totalConversions,
        totalSavings:     parseFloat(summary.totalSavings.toFixed(4))
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
};

// ─── PATCH /api/user/me ───────────────────────────────────────────────────────
const updateMe = async (req, res) => {
  try {
    const allowed = {};
    if (req.body.name)  allowed.name  = req.body.name.trim();
    if (req.body.email) allowed.email = req.body.email.toLowerCase().trim();

    // Prevent password updates through this route
    if (req.body.password || req.body.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Use /api/auth/reset-password to change your password.'
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      allowed,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, user: updated.toPublicJSON() });
  } catch (err) {
    console.error('Update profile error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This email is already in use.' });
    }
    res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
};

// ─── DELETE /api/user/me ──────────────────────────────────────────────────────
const deleteMe = async (req, res) => {
  try {
    // Delete the user AND all their conversion history
    await Promise.all([
      User.findByIdAndDelete(req.user._id),
      Conversion.deleteMany({ user: req.user._id })
    ]);

    res.status(200).json({ success: true, message: 'Account and all data deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting account.' });
  }
};

module.exports = { getMe, updateMe, deleteMe };

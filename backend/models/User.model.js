/**
 * BypassFX — User Model (Mongoose)
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false  // Never returned in queries by default
    },
    // For password-reset flow (OTP / token stored temporarily)
    resetToken: {
      type: String,
      select: false
    },
    resetTokenExpiry: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true  // adds createdAt and updatedAt automatically
  }
);

// ─── Pre-save hook: hash password before saving ───────────────────────────────
userSchema.pre('save', async function (next) {
  // Only run if passwordHash field is newly set (raw password string)
  if (!this.isModified('passwordHash')) return next();

  // If it looks like it's already a bcrypt hash, skip
  if (this.passwordHash.startsWith('$2')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance method: verify password ────────────────────────────────────────
userSchema.methods.matchPassword = async function (plainText) {
  return bcrypt.compare(plainText, this.passwordHash);
};

// ─── Instance method: sanitize for API responses ─────────────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    id:        this._id,
    name:      this.name,
    email:     this.email,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);

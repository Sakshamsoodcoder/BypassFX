/**
 * BypassFX — Conversion History Model (Mongoose)
 */

const mongoose = require('mongoose');

const legSchema = new mongoose.Schema(
  {
    from:          String,
    to:            String,
    rate:          Number,
    provider:      String,
    feePercent:    Number,
    feeSourceAmount: Number,
    inputAmount:   Number,
    outputAmount:  Number
  },
  { _id: false }
);

const conversionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    from:        { type: String, required: true, uppercase: true, length: 3 },
    to:          { type: String, required: true, uppercase: true, length: 3 },
    fromAmount:  { type: Number, required: true, min: 0 },
    toAmount:    { type: Number, required: true, min: 0 },
    savings:     { type: Number, default: 0 },
    savingsPct:  { type: Number, default: 0 },
    route:       { type: String },          // e.g. "INR → USD → EUR"
    provider:    { type: String },          // e.g. "Wise Multi-Hop"
    isOptimal:   { type: Boolean, default: false },
    hops:        [String],                  // ['INR', 'USD', 'EUR']
    legs:        [legSchema],               // detailed leg breakdown
    maxHops:     { type: Number, default: 3 }
  },
  {
    timestamps: true
  }
);

// Sort by newest by default
conversionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Conversion', conversionSchema);

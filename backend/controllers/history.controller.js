/**
 * BypassFX — Conversion History Controller
 * Handles: list, save, delete-one, clear-all
 */

const Conversion = require('../models/Conversion.model');

// ─── GET /api/history ─────────────────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const skip  = (page - 1) * limit;

    const [conversions, total] = await Promise.all([
      Conversion.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversion.countDocuments({ user: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      count:      conversions.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data:       conversions
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching history.' });
  }
};

// ─── POST /api/history ────────────────────────────────────────────────────────
const saveConversion = async (req, res) => {
  try {
    const {
      from, to, fromAmount, toAmount,
      savings, savingsPct,
      route, provider, isOptimal,
      hops, legs, maxHops
    } = req.body;

    const conversion = await Conversion.create({
      user:       req.user._id,
      from,
      to,
      fromAmount,
      toAmount,
      savings:    savings    || 0,
      savingsPct: savingsPct || 0,
      route,
      provider,
      isOptimal:  Boolean(isOptimal),
      hops:       hops   || [from, to],
      legs:       legs   || [],
      maxHops:    maxHops || 3
    });

    // Enforce 50-entry cap per user (delete oldest if over limit)
    const count = await Conversion.countDocuments({ user: req.user._id });
    if (count > 50) {
      const oldest = await Conversion.find({ user: req.user._id })
        .sort({ createdAt: 1 })
        .limit(count - 50)
        .select('_id');
      await Conversion.deleteMany({ _id: { $in: oldest.map(c => c._id) } });
    }

    res.status(201).json({ success: true, data: conversion });
  } catch (err) {
    console.error('Save conversion error:', err);
    res.status(500).json({ success: false, message: 'Server error saving conversion.' });
  }
};

// ─── DELETE /api/history/:id ──────────────────────────────────────────────────
const deleteConversion = async (req, res) => {
  try {
    const conversion = await Conversion.findOne({
      _id:  req.params.id,
      user: req.user._id       // Ownership check — users can only delete their own
    });

    if (!conversion) {
      return res.status(404).json({ success: false, message: 'Conversion not found.' });
    }

    await conversion.deleteOne();
    res.status(200).json({ success: true, message: 'Conversion deleted.' });
  } catch (err) {
    console.error('Delete conversion error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting conversion.' });
  }
};

// ─── DELETE /api/history ──────────────────────────────────────────────────────
const clearHistory = async (req, res) => {
  try {
    const result = await Conversion.deleteMany({ user: req.user._id });
    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} conversion(s).`
    });
  } catch (err) {
    console.error('Clear history error:', err);
    res.status(500).json({ success: false, message: 'Server error clearing history.' });
  }
};

module.exports = { getHistory, saveConversion, deleteConversion, clearHistory };

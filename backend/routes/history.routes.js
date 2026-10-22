/**
 * BypassFX — Conversion History Routes
 * GET    /api/history          list (paginated)
 * POST   /api/history          save a new conversion
 * DELETE /api/history/:id      delete one
 * DELETE /api/history          clear all
 */

const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');

const { protect }                                              = require('../middleware/auth');
const { getHistory, saveConversion, deleteConversion, clearHistory } = require('../controllers/history.controller');

const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

const saveRules = [
  body('from').isLength({ min: 3, max: 3 }).withMessage('from must be a 3-letter currency code').toUpperCase(),
  body('to').isLength({ min: 3, max: 3 }).withMessage('to must be a 3-letter currency code').toUpperCase(),
  body('fromAmount').isFloat({ min: 0 }).withMessage('fromAmount must be a positive number'),
  body('toAmount').isFloat({ min: 0 }).withMessage('toAmount must be a positive number')
];

// All routes require a valid JWT
router.use(protect);

router.get('/',    getHistory);
router.post('/',   saveRules, validate, saveConversion);
router.delete('/', clearHistory);
router.delete('/:id', deleteConversion);

module.exports = router;

/**
 * BypassFX — User Routes
 * GET    /api/user/me
 * PATCH  /api/user/me
 * DELETE /api/user/me
 */

const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');

const { protect }             = require('../middleware/auth');
const { getMe, updateMe, deleteMe } = require('../controllers/user.controller');

const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
};

const updateRules = [
  body('name').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Name must be 1-80 characters'),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail()
];

// All routes require a valid JWT
router.use(protect);

router.get('/',    getMe);
router.patch('/',  updateRules, validate, updateMe);
router.delete('/', deleteMe);

// Alias /me → /
router.get('/me',    getMe);
router.patch('/me',  updateRules, validate, updateMe);
router.delete('/me', deleteMe);

module.exports = router;

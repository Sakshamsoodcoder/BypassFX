/**
 * BypassFX — JWT Authentication Middleware
 * Protects routes by verifying the Bearer token in the Authorization header.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach fresh user data to request (excluding passwordHash)
    const user = await User.findById(decoded.id).select('-passwordHash -resetToken -resetTokenExpiry');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token is valid but user no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
};

module.exports = { protect };

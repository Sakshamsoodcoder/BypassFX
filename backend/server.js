/**
 * BypassFX — Express Server (Phase 2 Entry Point)
 *
 * Start (dev):  npm run dev   (uses nodemon)
 * Start (prod): npm start
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const { connectDB, isDBConnected } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const historyRoutes = require('./routes/history.routes');

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Express App Setup ────────────────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet());

// CORS — allow requests from the frontend origin
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow Postman / curl in development (no origin header)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true
}));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// Global rate limiter
app.use('/api', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/user',    userRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'BypassFX API is running',
    version: '2.0.0',
    dbConnected: isDBConnected(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ─── Frontend Static Files ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..'), {
  index: 'index.html',
  dotfiles: 'ignore'
}));

// ─── 404 Handler for API ─────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route ${req.method} ${req.url} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 BypassFX API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`   Health check → http://localhost:${PORT}/api/health\n`);
});

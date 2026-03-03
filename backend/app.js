require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const tenantRoutes = require('./modules/tenant/tenant.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const userRoutes = require('./modules/users/users.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const complaintRoutes = require('./modules/complaints/complaints.routes');
const visitorRoutes = require('./modules/visitors/visitors.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const parkingRoutes = require('./modules/parking/parking.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const { stripeWebhookHandler } = require('./services/stripe.service');

const logger = require('./utils/logger');

const app = express();

// ─── STRIPE WEBHOOK (raw body before json parser) ─────────────────────────────
app.post(
  '/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize());
app.use(compression());

// ─── LOGGING ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/tenants`, tenantRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/maintenance`, maintenanceRoutes);
app.use(`${API}/complaints`, complaintRoutes);
app.use(`${API}/visitors`, visitorRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/parking`, parkingRoutes);
app.use(`${API}/analytics`, analyticsRoutes);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`[ERROR] ${err.stack || err.message}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation Error', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : message,
  });
});

module.exports = app;

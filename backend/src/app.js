const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { log, httpLogger } = require('./config/logger');

require('dotenv').config({ path: __dirname + '/.env.local' });

const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const userRoutes = require('./routes/user.routes');
const ticketTypeRoutes = require('./routes/ticketType.routes');
const ticketRoutes = require('./routes/ticket.routes');
const reportsRoutes = require('./routes/reports.routes');
const adminRoutes = require('./routes/admin.routes');
const moderatorRoutes = require('./routes/moderator.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const storiesRoutes = require('./routes/stories.routes');
const followsRoutes = require('./routes/follows.routes');
const tagsRoutes = require('./routes/tags.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const commentsRoutes = require('./routes/comments.routes');
const commentLikesRoutes = require('./routes/comment-likes.routes');
const eventLikesRoutes = require('./routes/event-likes.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const meRoutes = require('./routes/me.routes');
const paymentRoutes = require('./routes/payment.routes');
let organizerRoutes;
try {
  organizerRoutes = require('./routes/organizer.routes');
  console.log('✅ organizer.routes importé avec succès');
} catch (err) {
  console.error('❌ Erreur import organizer.routes:', err.message);
  organizerRoutes = require('express').Router();
}
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Sécurité
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8081',
  'http://192.168.46.225:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

// Rate limiting
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // limit each IP to 200 requests per minute
    message: { message: 'Trop de requêtes, veuillez réessayer dans une minute' }
  });
  app.use(limiter);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitization des données contre les injections
app.use(mongoSanitize()); // Prévenir les injections NoSQL
app.use(xss()); // Nettoyer les inputs contre XSS

// Logger HTTP requests
app.use(httpLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ticket-types', ticketTypeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/comment-likes', commentLikesRoutes);
app.use('/api/event-likes', eventLikesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/me', meRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/organizer', organizerRoutes);

// Validation routes
const validationRoutes = require('./routes/validation.routes');
app.use('/api/validation', validationRoutes);

// Push notifications routes
const pushNotificationsRoutes = require('./routes/push-notifications.routes');
app.use('/api/push-notifications', pushNotificationsRoutes);

// Health check étendu pour production
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    api: {
      endpoints: '/api/auth, /api/events, /api/ticket-types, /api/tickets, /api/users, /api/admin, /api/moderator',
      database: 'Supabase PostgreSQL',
      authentication: 'JWT',
      roles: ['user', 'moderator', 'admin']
    }
  };
  
  try {
    // Test connexion base de données
    const { supabaseAPI } = require('./config/api');
    await supabaseAPI.select('Users', {}, { limit: 1 });
    health.database = { status: 'Connected', type: 'Supabase' };
  } catch (error) {
    health.database = { status: 'Error', error: error.message };
    health.status = 'DEGRADED';
  }

  res.status(200).json(health);
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'Event App API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for Railway/production
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  log.info(`🚀 Server running on port ${PORT}`);
  log.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
});

module.exports = app;

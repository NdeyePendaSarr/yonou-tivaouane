require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import de la connexion DB
const sequelize = require('./src/config/database');

// Import des routes
const authRoutes = require('./src/routes/auth.routes');
const editionsRoutes = require('./src/routes/editions.routes');
const sectionsRoutes = require('./src/routes/sections.routes');
const sousLocalitesRoutes = require('./src/routes/sousLocalites.routes'); // ✅ AJOUTÉ
const deplacementsRoutes = require('./src/routes/deplacements.routes');
const carsRoutes = require('./src/routes/cars.routes');
const incidentsRoutes = require('./src/routes/incidents.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const statsRoutes = require('./src/routes/stats.routes');

// Import du logger
const logger = require('./src/utils/logger');

// Import du gestionnaire d'erreurs
const errorHandler = require('./src/middlewares/errorHandler');

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de sécurité
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middlewares généraux
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger HTTP
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/editions', editionsRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/sous-localites', sousLocalitesRoutes); // ✅ AJOUTÉ
app.use('/api/deplacements', deplacementsRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stats', statsRoutes);

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Connexion à la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    await sequelize.authenticate();
    logger.info('✅ Connexion à la base de données PostgreSQL réussie');

    // Synchronisation des modèles (uniquement en développement)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✅ Modèles synchronisés avec la base de données');
    }

    // Démarrage du serveur
    app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
      logger.info(`📍 Environnement: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API disponible sur: http://localhost:${PORT}/api`);
      logger.info('📋 Routes disponibles:');
      logger.info('   - /api/auth');
      logger.info('   - /api/editions');
      logger.info('   - /api/sections');
      logger.info('   - /api/sous-localites ✨ NOUVEAU');
      logger.info('   - /api/deplacements');
      logger.info('   - /api/cars');
      logger.info('   - /api/incidents');
      logger.info('   - /api/dashboard');
      logger.info('   - /api/notifications');
      logger.info('   - /api/stats');
    });

  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrage
startServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  logger.error('❌ UNHANDLED REJECTION! Arrêt du serveur...');
  logger.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Arrêt du serveur...');
  logger.error(err);
  process.exit(1);
});

module.exports = app;
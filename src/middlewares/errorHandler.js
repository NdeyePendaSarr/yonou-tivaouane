const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[ERROR] ${err.message}`);
  logger.error(err.stack);

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Cette ressource existe déjà',
      field: err.errors[0]?.path
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide. Veuillez vous reconnecter.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Votre session a expiré. Veuillez vous reconnecter.'
    });
  }

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Erreur interne du serveur'
  });
};

module.exports = errorHandler;
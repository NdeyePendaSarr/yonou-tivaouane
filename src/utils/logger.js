// ====================================================================
// LOGGER - Système de logs avec Winston
// ====================================================================

const winston = require('winston');
const path = require('path');

// Définition des niveaux de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Couleurs pour les logs en console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format des logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

// Transports (destinations des logs)
const transports = [
  new winston.transports.Console({
    format: format
  }),
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false
});

module.exports = logger;
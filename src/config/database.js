const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'yonou_tivaouane',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    logging: process.env.NODE_ENV === 'development' 
      ? (msg) => logger.debug(msg) 
      : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    retry: {
      max: 3
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Connexion à PostgreSQL établie avec succès');
    return true;
  } catch (error) {
    logger.error('❌ Impossible de se connecter à la base de données:', error);
    return false;
  }
};

module.exports = sequelize;
module.exports.testConnection = testConnection;
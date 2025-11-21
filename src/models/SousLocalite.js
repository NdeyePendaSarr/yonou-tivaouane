// ==========================================
// FICHIER 3 : backend/src/models/SousLocalite.js
// ==========================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SousLocalite = sequelize.define('SousLocalite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.CHAR(1),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[A-Z]$/,
      notEmpty: true
    }
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ordre_affichage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  }
}, {
  tableName: 'sous_localites',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SousLocalite;
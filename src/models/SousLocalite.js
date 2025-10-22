const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SousLocalite = sequelize.define('sous_localites', {
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
      isIn: [['A', 'B', 'C', 'D', 'E']]
    }
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  ordre_affichage: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SousLocalite;
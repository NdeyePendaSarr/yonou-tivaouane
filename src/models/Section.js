const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Section = sequelize.define('sections', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  sous_localite_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sous_localites',
      key: 'id'
    }
  },
  president_nom: {
    type: DataTypes.STRING(100)
  },
  president_telephone: {
    type: DataTypes.STRING(20)
  },
  president_email: {
    type: DataTypes.STRING(150)
  },
  ordre_affichage: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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

module.exports = Section;
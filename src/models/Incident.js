const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Incident = sequelize.define('incidents', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  car_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type_incident: {
    type: DataTypes.ENUM('Panne', 'Accident', 'Retard', 'Crevaison', 'Contrôle', 'Autre'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  heure_incident: {
    type: DataTypes.DATE,
    allowNull: false
  },
  localisation: {
    type: DataTypes.STRING(255)
  },
  statut_resolution: {
    type: DataTypes.ENUM('En cours', 'Résolu'),
    defaultValue: 'En cours'
  },
  resolution_description: {
    type: DataTypes.TEXT
  },
  heure_resolution: {
    type: DataTypes.DATE
  },
  signale_par: {
    type: DataTypes.INTEGER
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

module.exports = Incident;
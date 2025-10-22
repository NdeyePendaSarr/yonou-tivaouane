const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('notifications', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('Incident', 'Retard', 'Arrivée complète', 'Alerte système'),
    allowNull: false
  },
  titre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  car_id: {
    type: DataTypes.INTEGER
  },
  deplacement_id: {
    type: DataTypes.INTEGER
  },
  incident_id: {
    type: DataTypes.INTEGER
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  destinataire_id: {
    type: DataTypes.INTEGER
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  createdAt: 'created_at'
});

module.exports = Notification;
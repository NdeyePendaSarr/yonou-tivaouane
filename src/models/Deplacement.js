const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deplacement = sequelize.define('deplacements', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  section_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  edition_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('ALLER', 'RETOUR'),
    allowNull: false
  },
  date_prevue: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  heure_prevue: {
    type: DataTypes.TIME
  },
  nombre_cars_prevus: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre_passagers_total: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  statut: {
    type: DataTypes.ENUM('Non commencé', 'En cours', 'Terminé', 'Incident'),
    defaultValue: 'Non commencé'
  },
  commentaire: {
    type: DataTypes.TEXT
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

module.exports = Deplacement;
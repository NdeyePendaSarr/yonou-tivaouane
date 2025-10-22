const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EditionMawlid = sequelize.define('editions_mawlid', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  annee: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    validate: {
      min: 2025,
      max: 2100
    }
  },
  date_mawlid: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  date_debut_periode: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  date_fin_periode: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  statut: {
    type: DataTypes.ENUM('Planifiée', 'En cours', 'Terminée', 'Archivée'),
    allowNull: false,
    defaultValue: 'Planifiée'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  description: {
    type: DataTypes.TEXT
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
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
  updatedAt: 'updated_at',
  validate: {
    datesCoherentes() {
      if (this.date_debut_periode > this.date_mawlid) {
        throw new Error('La date de début doit être antérieure à la date du Mawlid');
      }
      if (this.date_mawlid > this.date_fin_periode) {
        throw new Error('La date du Mawlid doit être antérieure à la date de fin');
      }
    }
  }
});

module.exports = EditionMawlid;
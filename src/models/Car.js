const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Car = sequelize.define('cars', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  deplacement_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numero_car: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  nombre_passagers: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  route_empruntee: {
    type: DataTypes.ENUM('Route Nationale', 'Autoroute', 'Autre'),
    allowNull: false
  },
  responsable_car: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  contact_responsable: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  immatriculation: {
    type: DataTypes.STRING(50)
  },
  nom_chauffeur: {
    type: DataTypes.STRING(100)
  },
  contact_chauffeur: {
    type: DataTypes.STRING(20)
  },
  statut_temps_reel: {
    type: DataTypes.ENUM(
      'À Mbour', 'En route', 'Arrivé à Tivaouane', 
      'À Tivaouane', 'En route vers Mbour', 'Arrivé à Mbour', 'Incident'
    ),
    allowNull: false,
    defaultValue: 'À Mbour'
  },
  heure_depart_effective: {
    type: DataTypes.DATE
  },
  heure_arrivee_effective: {
    type: DataTypes.DATE
  },
  duree_trajet_minutes: {
    type: DataTypes.INTEGER
  },
  alerte_retard: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  hooks: {
    beforeSave: (car) => {
      if (car.heure_depart_effective && car.heure_arrivee_effective) {
        const depart = new Date(car.heure_depart_effective);
        const arrivee = new Date(car.heure_arrivee_effective);
        const dureeMs = arrivee - depart;
        car.duree_trajet_minutes = Math.floor(dureeMs / (1000 * 60));
        
        if (car.duree_trajet_minutes > 360) {
          car.alerte_retard = true;
        }
      }
    }
  }
});

module.exports = Car;
const sequelize = require('../config/database');

// Import des modèles
const User = require('./User');
const EditionMawlid = require('./EditionMawlid');
const SousLocalite = require('./SousLocalite');
const Section = require('./Section');
const Deplacement = require('./Deplacement');
const Car = require('./Car');
const Incident = require('./Incident');
const Notification = require('./Notification');

// ====================================================================
// DÉFINITION DES ASSOCIATIONS
// ====================================================================

// User <-> EditionMawlid
User.hasMany(EditionMawlid, { 
  foreignKey: 'created_by', 
  as: 'editionsCreated' 
});
EditionMawlid.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

// SousLocalite <-> Section
SousLocalite.hasMany(Section, { 
  foreignKey: 'sous_localite_id', 
  as: 'sections',
  onDelete: 'CASCADE'
});
Section.belongsTo(SousLocalite, { 
  foreignKey: 'sous_localite_id', 
  as: 'sousLocalite' 
});

// Section <-> Deplacement
Section.hasMany(Deplacement, { 
  foreignKey: 'section_id', 
  as: 'deplacements',
  onDelete: 'CASCADE'
});
Deplacement.belongsTo(Section, { 
  foreignKey: 'section_id', 
  as: 'section' 
});

// EditionMawlid <-> Deplacement
EditionMawlid.hasMany(Deplacement, { 
  foreignKey: 'edition_id', 
  as: 'deplacements',
  onDelete: 'CASCADE'
});
Deplacement.belongsTo(EditionMawlid, { 
  foreignKey: 'edition_id', 
  as: 'edition' 
});

// Deplacement <-> Car
Deplacement.hasMany(Car, { 
  foreignKey: 'deplacement_id', 
  as: 'cars',
  onDelete: 'CASCADE'
});
Car.belongsTo(Deplacement, { 
  foreignKey: 'deplacement_id', 
  as: 'deplacement' 
});

// Car <-> Incident
Car.hasMany(Incident, { 
  foreignKey: 'car_id', 
  as: 'incidents',
  onDelete: 'CASCADE'
});
Incident.belongsTo(Car, { 
  foreignKey: 'car_id', 
  as: 'car' 
});

// User <-> Incident (signalé par)
User.hasMany(Incident, { 
  foreignKey: 'signale_par', 
  as: 'incidentsSignaled' 
});
Incident.belongsTo(User, { 
  foreignKey: 'signale_par', 
  as: 'signaleur' 
});

// Notification <-> Car
Car.hasMany(Notification, { 
  foreignKey: 'car_id', 
  as: 'notifications',
  onDelete: 'CASCADE'
});
Notification.belongsTo(Car, { 
  foreignKey: 'car_id', 
  as: 'car' 
});

// Notification <-> Deplacement
Deplacement.hasMany(Notification, { 
  foreignKey: 'deplacement_id', 
  as: 'notifications',
  onDelete: 'CASCADE'
});
Notification.belongsTo(Deplacement, { 
  foreignKey: 'deplacement_id', 
  as: 'deplacement' 
});

// Notification <-> Incident
Incident.hasMany(Notification, { 
  foreignKey: 'incident_id', 
  as: 'notifications',
  onDelete: 'CASCADE'
});
Notification.belongsTo(Incident, { 
  foreignKey: 'incident_id', 
  as: 'incident' 
});

// Notification <-> User (destinataire)
User.hasMany(Notification, { 
  foreignKey: 'destinataire_id', 
  as: 'notificationsReceived',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, { 
  foreignKey: 'destinataire_id', 
  as: 'destinataire' 
});

// ====================================================================
// EXPORT DE TOUS LES MODÈLES
// ====================================================================

module.exports = {
  sequelize,
  User,
  EditionMawlid,
  SousLocalite,
  Section,
  Deplacement,
  Car,
  Incident,
  Notification
};
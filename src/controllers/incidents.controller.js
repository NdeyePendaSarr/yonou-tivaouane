const { Incident, Car, Deplacement, Section, User, SousLocalite } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir tous les incidents
// @route   GET /api/incidents
// @access  Private
exports.getAllIncidents = async (req, res, next) => {
  try {
    const { car_id, type_incident, statut_resolution } = req.query;
    
    const whereClause = {};
    if (car_id) whereClause.car_id = car_id;
    if (type_incident) whereClause.type_incident = type_incident;
    if (statut_resolution) whereClause.statut_resolution = statut_resolution;

    const incidents = await Incident.findAll({
      where: whereClause,
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{
              model: Section,
              as: 'section',
              include: [{
                model: SousLocalite,
                as: 'sousLocalite',
                attributes: ['id', 'code', 'nom']
              }]
            }]
          }]
        },
        {
          model: User,
          as: 'signaleur',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ],
      order: [['heure_incident', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: { incidents }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les incidents non résolus
// @route   GET /api/incidents/non-resolus
// @access  Private
exports.getIncidentsNonResolus = async (req, res, next) => {
  try {
    const incidents = await Incident.findAll({
      where: { statut_resolution: 'En cours' },
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{
              model: Section,
              as: 'section',
              include: [{
                model: SousLocalite,
                as: 'sousLocalite'
              }]
            }]
          }]
        },
        {
          model: User,
          as: 'signaleur',
          attributes: ['id', 'nom', 'prenom']
        }
      ],
      order: [['heure_incident', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: { incidents }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un incident par ID
// @route   GET /api/incidents/:id
// @access  Private
exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{
              model: Section,
              as: 'section'
            }]
          }]
        },
        {
          model: User,
          as: 'signaleur',
          attributes: ['id', 'nom', 'prenom', 'email', 'telephone']
        }
      ]
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: { incident }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Signaler un incident
// @route   POST /api/incidents
// @access  Private
exports.signalerIncident = async (req, res, next) => {
  try {
    const {
      car_id,
      type_incident,
      description,
      heure_incident,
      localisation
    } = req.body;

    // Vérifier que le car existe
    const car = await Car.findByPk(car_id, {
      include: [{
        model: Deplacement,
        as: 'deplacement',
        include: [{
          model: Section,
          as: 'section'
        }]
      }]
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    // Créer l'incident
    const incident = await Incident.create({
      car_id,
      type_incident,
      description,
      heure_incident: heure_incident || new Date(),
      localisation,
      statut_resolution: 'En cours',
      signale_par: req.user.id
    });

    // Mettre à jour le statut du car
    car.statut_temps_reel = 'Incident';
    await car.save();

    logger.info(`Incident signalé: ${type_incident} sur car ${car_id} par ${req.user.email}`);

    // TODO: Créer une notification automatique

    // Récupérer l'incident complet
    const incidentComplet = await Incident.findByPk(incident.id, {
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{ model: Section, as: 'section' }]
          }]
        },
        {
          model: User,
          as: 'signaleur',
          attributes: ['id', 'nom', 'prenom']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Incident signalé avec succès',
      data: { incident: incidentComplet }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un incident
// @route   PUT /api/incidents/:id
// @access  Private
exports.updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident introuvable'
      });
    }

    const {
      type_incident,
      description,
      localisation,
      heure_incident
    } = req.body;

    if (type_incident) incident.type_incident = type_incident;
    if (description) incident.description = description;
    if (localisation !== undefined) incident.localisation = localisation;
    if (heure_incident) incident.heure_incident = heure_incident;

    await incident.save();

    logger.info(`Incident ${incident.id} mis à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Incident mis à jour avec succès',
      data: { incident }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Résoudre un incident
// @route   PUT /api/incidents/:id/resolve
// @access  Private
exports.resoudreIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [{
        model: Car,
        as: 'car'
      }]
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident introuvable'
      });
    }

    const { resolution_description, nouveau_statut_car } = req.body;

    incident.statut_resolution = 'Résolu';
    incident.heure_resolution = new Date();
    incident.resolution_description = resolution_description || 'Incident résolu';

    await incident.save();

    // Mettre à jour le statut du car si fourni
    if (nouveau_statut_car && incident.car) {
      incident.car.statut_temps_reel = nouveau_statut_car;
      await incident.car.save();
    }

    logger.info(`Incident ${incident.id} résolu par ${req.user.email}`);

    // TODO: Créer une notification

    res.status(200).json({
      success: true,
      message: 'Incident résolu avec succès',
      data: { incident }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un incident
// @route   DELETE /api/incidents/:id
// @access  Private (Super Admin)
exports.deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident introuvable'
      });
    }

    await incident.destroy();

    logger.info(`Incident ${incident.id} supprimé par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Incident supprimé avec succès'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des incidents
// @route   GET /api/incidents/stats
// @access  Private
exports.getIncidentsStats = async (req, res, next) => {
  try {
    const { edition_id } = req.query;

    let whereClause = {};
    
    // Si edition_id fourni, filtrer par édition
    if (edition_id) {
      const cars = await Car.findAll({
        include: [{
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id }
        }]
      });
      
      const carIds = cars.map(c => c.id);
      whereClause.car_id = carIds;
    }

    const incidents = await Incident.findAll({
      where: whereClause
    });

    const stats = {
      total: incidents.length,
      en_cours: incidents.filter(i => i.statut_resolution === 'En cours').length,
      resolus: incidents.filter(i => i.statut_resolution === 'Résolu').length,
      par_type: {
        'Panne': incidents.filter(i => i.type_incident === 'Panne').length,
        'Accident': incidents.filter(i => i.type_incident === 'Accident').length,
        'Retard': incidents.filter(i => i.type_incident === 'Retard').length,
        'Crevaison': incidents.filter(i => i.type_incident === 'Crevaison').length,
        'Contrôle': incidents.filter(i => i.type_incident === 'Contrôle').length,
        'Autre': incidents.filter(i => i.type_incident === 'Autre').length
      }
    };

    res.status(200).json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    next(error);
  }
};
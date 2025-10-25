// ====================================================================
// FICHIER 3 : backend/controllers/stats.controller.js (NOUVEAU)
// ====================================================================

const { 
  Deplacement, 
  Section, 
  EditionMawlid, 
  Car, 
  SousLocalite, 
  Incident,
  User 
} = require('../models');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// @desc    Statistiques globales du dashboard
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Récupérer l'édition active
    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!activeEdition) {
      return res.status(200).json({
        success: true,
        message: 'Aucune édition active',
        data: {
          total_sections: 31,
          total_deplacements: 0,
          total_cars: 0,
          total_passagers: 0,
          incidents_en_cours: 0,
          cars_en_route: 0,
          cars_en_retard: 0
        }
      });
    }

    // Compter les sections actives
    const totalSections = await Section.count({
      where: { is_active: true }
    });

    // Compter les déplacements de l'édition active
    const totalDeplacements = await Deplacement.count({
      where: { edition_id: activeEdition.id }
    });

    // Compter les cars de l'édition active
    const cars = await Car.findAll({
      include: [{
        model: Deplacement,
        as: 'deplacement',
        where: { edition_id: activeEdition.id }
      }]
    });

    const totalCars = cars.length;
    const totalPassagers = cars.reduce((sum, car) => sum + (car.nombre_passagers || 0), 0);
    const carsEnRoute = cars.filter(c => 
      c.statut_temps_reel === 'En route' || 
      c.statut_temps_reel === 'En route vers Mbour'
    ).length;
    const carsEnRetard = cars.filter(c => c.alerte_retard === true).length;

    // Compter les incidents en cours
    const incidentsEnCours = await Incident.count({
      where: { statut_resolution: 'En cours' },
      include: [{
        model: Car,
        as: 'car',
        include: [{
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id: activeEdition.id }
        }]
      }]
    });

    // Statistiques par type de déplacement
    const statsParType = await Deplacement.findAll({
      where: { edition_id: activeEdition.id },
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('Deplacement.id')), 'nombre_deplacements']
      ],
      include: [{
        model: Car,
        as: 'cars',
        attributes: []
      }],
      group: ['type', 'Deplacement.id'],
      raw: false
    });

    res.status(200).json({
      success: true,
      data: {
        total_sections: totalSections,
        total_deplacements: totalDeplacements,
        total_cars: totalCars,
        total_passagers: totalPassagers,
        incidents_en_cours: incidentsEnCours,
        cars_en_route: carsEnRoute,
        cars_en_retard: carsEnRetard,
        edition_active: {
          id: activeEdition.id,
          annee: activeEdition.annee
        }
      }
    });

  } catch (error) {
    logger.error('Erreur getDashboardStats:', error);
    next(error);
  }
};

// @desc    Statistiques par sous-localité
// @route   GET /api/stats/sous-localites/:editionId
// @access  Private
exports.getStatsSousLocalites = async (req, res, next) => {
  try {
    const { editionId } = req.params;

    const edition = await EditionMawlid.findByPk(editionId);
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    const sousLocalites = await SousLocalite.findAll({
      include: [
        {
          model: Section,
          as: 'sections',
          include: [
            {
              model: Deplacement,
              as: 'deplacements',
              where: { edition_id: editionId },
              required: false,
              include: [
                {
                  model: Car,
                  as: 'cars',
                  required: false
                }
              ]
            }
          ]
        }
      ],
      order: [['ordre_affichage', 'ASC']]
    });

    const stats = sousLocalites.map(sl => {
      const sections = sl.sections || [];
      const deplacements = sections.flatMap(s => s.deplacements || []);
      const cars = deplacements.flatMap(d => d.cars || []);
      
      return {
        id: sl.id,
        code: sl.code,
        nom: sl.nom,
        nombre_sections: sections.length,
        nombre_deplacements: deplacements.length,
        nombre_cars: cars.length,
        total_passagers: cars.reduce((sum, car) => sum + (car.nombre_passagers || 0), 0)
      };
    });

    res.status(200).json({
      success: true,
      count: stats.length,
      data: {
        edition_id: parseInt(editionId),
        sous_localites: stats
      }
    });

  } catch (error) {
    logger.error('Erreur getStatsSousLocalites:', error);
    next(error);
  }
};

// @desc    Statistiques complètes d'une édition
// @route   GET /api/stats/edition/:editionId
// @access  Private
exports.getStatsEdition = async (req, res, next) => {
  try {
    const { editionId } = req.params;

    const edition = await EditionMawlid.findByPk(editionId);
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    // Récupérer tous les déplacements
    const deplacements = await Deplacement.findAll({
      where: { edition_id: editionId },
      include: [
        {
          model: Car,
          as: 'cars',
          include: [
            {
              model: Incident,
              as: 'incidents'
            }
          ]
        }
      ]
    });

    const deplacementsAller = deplacements.filter(d => d.type === 'ALLER');
    const deplacementsRetour = deplacements.filter(d => d.type === 'RETOUR');
    const cars = deplacements.flatMap(d => d.cars || []);
    const incidents = cars.flatMap(c => c.incidents || []);

    const stats = {
      id: edition.id,
      annee: edition.annee,
      statut: edition.statut,
      total_deplacements: deplacements.length,
      deplacements_aller: deplacementsAller.length,
      deplacements_retour: deplacementsRetour.length,
      total_cars: cars.length,
      total_passagers: cars.reduce((sum, car) => sum + (car.nombre_passagers || 0), 0),
      total_incidents: incidents.length,
      incidents_resolus: incidents.filter(i => i.statut_resolution === 'Résolu').length,
      cars_en_route: cars.filter(c => 
        c.statut_temps_reel === 'En route' || 
        c.statut_temps_reel === 'En route vers Mbour'
      ).length,
      cars_arrives: cars.filter(c => 
        c.statut_temps_reel === 'Arrivé à Tivaouane' || 
        c.statut_temps_reel === 'Arrivé à Mbour'
      ).length
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Erreur getStatsEdition:', error);
    next(error);
  }
};

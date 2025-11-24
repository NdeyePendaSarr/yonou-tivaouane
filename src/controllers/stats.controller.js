const { 
  Deplacement, 
  Section, 
  EditionMawlid, 
  Car, 
  SousLocalite, 
  Incident 
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// @desc    Statistiques globales du dashboard
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Récupérer l'édition active
    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    // 2. Compter les sections actives
    const totalSections = await Section.count({ where: { is_active: true } });

    // Si aucune édition active, retourner données de base
    if (!activeEdition) {
      return res.status(200).json({
        success: true,
        data: {
          edition_active: null,
          total_sections: totalSections,
          total_cars: 0,
          total_passagers: 0,
          deplacements_aller: 0,
          deplacements_retour: 0,
          cars_en_route: 0,
          cars_arrives: 0,
          cars_en_retard: 0,
          incidents_en_cours: 0,
          incidents_resolus: 0,
          incidents_total: 0,
          taux_remplissage: 0
        }
      });
    }

    // 3. Récupérer tous les déplacements de l'édition active
    const deplacements = await Deplacement.findAll({
      where: { edition_id: activeEdition.id },
      include: [
        {
          model: Car,
          as: 'cars'
        }
      ]
    });

    // 4. Calculer les statistiques
    const deplacementsAller = deplacements.filter(d => d.type === 'ALLER').length;
    const deplacementsRetour = deplacements.filter(d => d.type === 'RETOUR').length;

    // 5. Récupérer tous les cars de l'édition
    const allCars = await Car.findAll({
      include: [{
        model: Deplacement,
        as: 'deplacement',
        where: { edition_id: activeEdition.id },
        required: false // ⚠️ Important : permet de récupérer aussi les cars sans déplacement
      }]
    });

    const totalCars = allCars.length;
    const totalPassagers = allCars.reduce((sum, car) => sum + (car.nombre_passagers || 0), 0);

    // 6. Stats des cars par statut temps réel
    const carsEnRoute = allCars.filter(c => 
      c.statut_temps_reel === 'En route' || 
      c.statut_temps_reel === 'En route vers Mbour'
    ).length;

    const carsArrives = allCars.filter(c => 
      c.statut_temps_reel === 'Arrivé à Tivaouane' || 
      c.statut_temps_reel === 'Arrivé à Mbour'
    ).length;

    const carsEnRetard = allCars.filter(c => c.alerte_retard === true).length;

    // 7. ⚠️ CORRECTION : Stats des incidents avec la bonne colonne
    const carIds = allCars.map(c => c.id);

    let incidentsEnCours = 0;
    let incidentsResolus = 0;
    let totalIncidents = 0;

    if (carIds.length > 0) {
      // La colonne s'appelle "statut_resolution" et non "statut"
      incidentsEnCours = await Incident.count({
        where: { 
          car_id: { [Op.in]: carIds },
          statut_resolution: 'En cours'
        }
      });

      incidentsResolus = await Incident.count({
        where: { 
          car_id: { [Op.in]: carIds },
          statut_resolution: 'Résolu'
        }
      });

      totalIncidents = await Incident.count({
        where: { 
          car_id: { [Op.in]: carIds }
        }
      });
    }

    // Log pour déboguer
    logger.info('📊 Stats Incidents:', {
      carIds: carIds.length,
      total: totalIncidents,
      en_cours: incidentsEnCours,
      resolus: incidentsResolus
    });

    // 8. Calculer le taux de remplissage
    let tauxRemplissage = 0;
    if (totalCars > 0) {
      const carsOperationnels = allCars.filter(c => 
        c.statut_temps_reel !== 'Incident'
      ).length;
      tauxRemplissage = Math.round((carsOperationnels / totalCars) * 100);
    }

    // 9. Retourner toutes les stats
    const stats = {
      edition_active: {
        id: activeEdition.id,
        annee: activeEdition.annee,
        statut: activeEdition.statut
      },
      total_sections: totalSections,
      total_cars: totalCars,
      total_passagers: totalPassagers,
      deplacements_aller: deplacementsAller,
      deplacements_retour: deplacementsRetour,
      cars_en_route: carsEnRoute,
      cars_arrives: carsArrives,
      cars_en_retard: carsEnRetard,
      incidents_en_cours: incidentsEnCours,
      incidents_resolus: incidentsResolus,
      incidents_total: totalIncidents,
      taux_remplissage: tauxRemplissage
    };

    logger.info('✅ Stats dashboard calculées:', stats);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('❌ Erreur getDashboardStats:', error);
    next(error);
  }
};

// @desc    Statistiques par sous-localité
// @route   GET /api/stats/sous-localites/:editionId
// @access  Private
exports.getStatsSousLocalites = async (req, res, next) => {
  try {
    const { editionId } = req.params;

    // Récupérer toutes les sous-localités avec leurs sections
    const sousLocalites = await SousLocalite.findAll({
      include: [{
        model: Section,
        as: 'sections',
        where: { is_active: true },
        required: false
      }]
    });

    // Pour chaque sous-localité, calculer les stats
    const statsParSousLocalite = await Promise.all(
      sousLocalites.map(async (sl) => {
        const sections = sl.sections || [];
        const sectionIds = sections.map(s => s.id);

        // Compter les déplacements
        const deplacements = await Deplacement.count({
          where: { 
            edition_id: editionId,
            section_id: { [Op.in]: sectionIds }
          }
        });

        // Compter les cars
        const cars = await Car.count({
          include: [{
            model: Deplacement,
            as: 'deplacement',
            where: { 
              edition_id: editionId,
              section_id: { [Op.in]: sectionIds }
            }
          }]
        });

        return {
          id: sl.id,
          code: sl.code,
          nom: sl.nom,
          nombre_sections: sections.length,
          nombre_deplacements: deplacements,
          nombre_cars: cars
        };
      })
    );

    res.status(200).json({
      success: true,
      count: statsParSousLocalite.length,
      data: {
        sous_localites: statsParSousLocalite
      }
    });

  } catch (error) {
    logger.error('❌ Erreur getStatsSousLocalites:', error);
    next(error);
  }
};

// @desc    Statistiques d'une édition
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

    // Récupérer les stats complètes de cette édition
    const deplacements = await Deplacement.findAll({
      where: { edition_id: editionId }
    });

    const cars = await Car.findAll({
      include: [{
        model: Deplacement,
        as: 'deplacement',
        where: { edition_id: editionId },
        required: false
      }]
    });

    const carIds = cars.map(c => c.id);

    // Compter tous les incidents liés à ces cars (avec la bonne colonne)
    let totalIncidents = 0;
    if (carIds.length > 0) {
      totalIncidents = await Incident.count({
        where: { 
          car_id: { [Op.in]: carIds }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: edition.id,
        annee: edition.annee,
        statut: edition.statut,
        is_active: edition.is_active,
        total_deplacements: deplacements.length,
        total_cars: cars.length,
        total_incidents: totalIncidents,
        deplacements_aller: deplacements.filter(d => d.type === 'ALLER').length,
        deplacements_retour: deplacements.filter(d => d.type === 'RETOUR').length
      }
    });

  } catch (error) {
    logger.error('❌ Erreur getStatsEdition:', error);
    next(error);
  }
};
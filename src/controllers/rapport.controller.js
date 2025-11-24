const { 
  EditionMawlid, 
  Deplacement, 
  Section, 
  Car, 
  Incident,
  SousLocalite,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// =====================================================
// 📊 RAPPORTS PAR ÉDITION
// =====================================================

// @desc    Rapport complet d'une édition
// @route   GET /api/rapports/edition/:editionId
// @access  Private
exports.getRapportEdition = async (req, res, next) => {
  try {
    const { editionId } = req.params;

    // Récupérer l'édition
    const edition = await EditionMawlid.findByPk(editionId);
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    // Récupérer tous les déplacements avec leurs détails
    const deplacements = await Deplacement.findAll({
      where: { edition_id: editionId },
      include: [
        {
          model: Section,
          as: 'section',
          include: [{
            model: SousLocalite,
            as: 'sousLocalite'
          }]
        },
        {
          model: Car,
          as: 'cars',
          include: [{
            model: Incident,
            as: 'incidents'
          }]
        }
      ],
      order: [['type', 'ASC'], ['date_prevue', 'ASC']]
    });

    // Calculer les statistiques globales
    const allCars = deplacements.flatMap(d => d.cars || []);
    const allIncidents = allCars.flatMap(c => c.incidents || []);

    const stats = {
      nombre_deplacements: deplacements.length,
      nombre_deplacements_aller: deplacements.filter(d => d.type === 'ALLER').length,
      nombre_deplacements_retour: deplacements.filter(d => d.type === 'RETOUR').length,
      nombre_cars_total: allCars.length,
      nombre_passagers_total: allCars.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0),
      nombre_incidents_total: allIncidents.length,
      nombre_incidents_resolus: allIncidents.filter(i => i.statut_resolution === 'Résolu').length,
      nombre_incidents_en_cours: allIncidents.filter(i => i.statut_resolution === 'En cours').length
    };

    // Calculer les temps moyens
    const carsAvecDuree = allCars.filter(c => c.duree_trajet_minutes !== null);
    const tempsMoyenMinutes = carsAvecDuree.length > 0
      ? Math.round(carsAvecDuree.reduce((sum, c) => sum + c.duree_trajet_minutes, 0) / carsAvecDuree.length)
      : 0;

    // Sections les plus ponctuelles (taux d'arrivée à l'heure)
    const sectionsPonctualite = [];
    for (const deplacement of deplacements) {
      const cars = deplacement.cars || [];
      const carsArrives = cars.filter(c => c.heure_arrivee_effective !== null);
      const carsEnRetard = cars.filter(c => c.alerte_retard === true);
      
      if (carsArrives.length > 0) {
        const tauxPonctualite = Math.round(
          ((carsArrives.length - carsEnRetard.length) / carsArrives.length) * 100
        );

        sectionsPonctualite.push({
          section: deplacement.section.nom,
          sous_localite: deplacement.section.sousLocalite.code,
          type: deplacement.type,
          cars_total: cars.length,
          cars_arrives: carsArrives.length,
          cars_en_retard: carsEnRetard.length,
          taux_ponctualite: tauxPonctualite
        });
      }
    }

    // Trier par ponctualité décroissante
    sectionsPonctualite.sort((a, b) => b.taux_ponctualite - a.taux_ponctualite);

    // Rapport par section
    const rapportParSection = deplacements.map(deplacement => {
      const cars = deplacement.cars || [];
      const incidents = cars.flatMap(c => c.incidents || []);

      return {
        section_id: deplacement.section.id,
        section_nom: deplacement.section.nom,
        sous_localite: deplacement.section.sousLocalite.code,
        type: deplacement.type,
        date_prevue: deplacement.date_prevue,
        heure_prevue: deplacement.heure_prevue,
        statut: deplacement.statut,
        nombre_cars_prevus: deplacement.nombre_cars_prevus,
        nombre_cars_effectifs: cars.length,
        nombre_passagers: cars.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0),
        cars_partis: cars.filter(c => c.heure_depart_effective !== null).length,
        cars_arrives: cars.filter(c => c.heure_arrivee_effective !== null).length,
        cars_en_retard: cars.filter(c => c.alerte_retard === true).length,
        nombre_incidents: incidents.length,
        incidents_details: incidents.map(i => ({
          type: i.type_incident,
          description: i.description,
          statut: i.statut_resolution,
          heure: i.heure_incident
        }))
      };
    });

    const rapport = {
      edition: {
        id: edition.id,
        annee: edition.annee,
        date_mawlid: edition.date_mawlid,
        statut: edition.statut
      },
      statistiques_globales: {
        ...stats,
        temps_moyen_trajet_minutes: tempsMoyenMinutes,
        temps_moyen_trajet_heures: Math.floor(tempsMoyenMinutes / 60) + 'h' + (tempsMoyenMinutes % 60) + 'min'
      },
      sections_plus_ponctuelles: sectionsPonctualite.slice(0, 10),
      rapport_par_section: rapportParSection,
      date_generation: new Date()
    };

    logger.info(`Rapport édition ${edition.annee} généré par ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: rapport
    });

  } catch (error) {
    logger.error('Erreur getRapportEdition:', error);
    next(error);
  }
};

// @desc    Rapport détaillé d'un déplacement
// @route   GET /api/rapports/deplacement/:deplacementId
// @access  Private
exports.getRapportDeplacement = async (req, res, next) => {
  try {
    const { deplacementId } = req.params;

    const deplacement = await Deplacement.findByPk(deplacementId, {
      include: [
        {
          model: Section,
          as: 'section',
          include: [{
            model: SousLocalite,
            as: 'sousLocalite'
          }]
        },
        {
          model: EditionMawlid,
          as: 'edition'
        },
        {
          model: Car,
          as: 'cars',
          include: [{
            model: Incident,
            as: 'incidents'
          }]
        }
      ]
    });

    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    const cars = deplacement.cars || [];
    const incidents = cars.flatMap(c => c.incidents || []);

    // Analyser les temps de trajet
    const tempsTrajet = cars
      .filter(c => c.duree_trajet_minutes !== null)
      .map(c => c.duree_trajet_minutes);

    const tempsMoyen = tempsTrajet.length > 0
      ? Math.round(tempsTrajet.reduce((a, b) => a + b, 0) / tempsTrajet.length)
      : 0;

    const tempsMin = tempsTrajet.length > 0 ? Math.min(...tempsTrajet) : 0;
    const tempsMax = tempsTrajet.length > 0 ? Math.max(...tempsTrajet) : 0;

    const rapport = {
      deplacement: {
        id: deplacement.id,
        section: deplacement.section.nom,
        sous_localite: deplacement.section.sousLocalite.nom,
        type: deplacement.type,
        date_prevue: deplacement.date_prevue,
        heure_prevue: deplacement.heure_prevue,
        statut: deplacement.statut
      },
      edition: {
        annee: deplacement.edition.annee
      },
      statistiques: {
        cars_prevus: deplacement.nombre_cars_prevus,
        cars_effectifs: cars.length,
        passagers_total: cars.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0),
        cars_partis: cars.filter(c => c.heure_depart_effective !== null).length,
        cars_arrives: cars.filter(c => c.heure_arrivee_effective !== null).length,
        cars_en_retard: cars.filter(c => c.alerte_retard === true).length,
        incidents_total: incidents.length
      },
      temps_trajet: {
        moyen_minutes: tempsMoyen,
        min_minutes: tempsMin,
        max_minutes: tempsMax,
        moyen_format: Math.floor(tempsMoyen / 60) + 'h' + (tempsMoyen % 60) + 'min'
      },
      cars_details: cars.map(c => ({
        numero: c.numero_car,
        passagers: c.nombre_passagers,
        statut: c.statut_temps_reel,
        depart: c.heure_depart_effective,
        arrivee: c.heure_arrivee_effective,
        duree_minutes: c.duree_trajet_minutes,
        en_retard: c.alerte_retard,
        responsable: c.responsable_car,
        contact: c.contact_responsable
      })),
      incidents: incidents.map(i => ({
        car_numero: cars.find(c => c.id === i.car_id)?.numero_car,
        type: i.type_incident,
        description: i.description,
        heure: i.heure_incident,
        statut: i.statut_resolution,
        resolution: i.resolution_description
      }))
    };

    res.status(200).json({
      success: true,
      data: rapport
    });

  } catch (error) {
    logger.error('Erreur getRapportDeplacement:', error);
    next(error);
  }
};

// =====================================================
// 📜 HISTORIQUE MULTI-ANNÉES
// =====================================================

// @desc    Obtenir l'historique de toutes les éditions
// @route   GET /api/rapports/historique
// @access  Private
exports.getHistorique = async (req, res, next) => {
  try {
    const editions = await EditionMawlid.findAll({
      order: [['annee', 'DESC']]
    });

    const historique = await Promise.all(
      editions.map(async (edition) => {
        const deplacements = await Deplacement.count({
          where: { edition_id: edition.id }
        });

        const cars = await Car.count({
          include: [{
            model: Deplacement,
            as: 'deplacement',
            where: { edition_id: edition.id }
          }]
        });

        const carsData = await Car.findAll({
          include: [{
            model: Deplacement,
            as: 'deplacement',
            where: { edition_id: edition.id }
          }]
        });

        const passagers = carsData.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0);

        const carIds = carsData.map(c => c.id);
        const incidents = carIds.length > 0 
          ? await Incident.count({ where: { car_id: { [Op.in]: carIds } } })
          : 0;

        return {
          id: edition.id,
          annee: edition.annee,
          date_mawlid: edition.date_mawlid,
          statut: edition.statut,
          is_active: edition.is_active,
          statistiques: {
            deplacements,
            cars,
            passagers,
            incidents
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: historique.length,
      data: { historique }
    });

  } catch (error) {
    logger.error('Erreur getHistorique:', error);
    next(error);
  }
};

// @desc    Comparer deux éditions
// @route   GET /api/rapports/comparaison
// @access  Private
exports.comparerEditions = async (req, res, next) => {
  try {
    const { edition1_id, edition2_id } = req.query;

    if (!edition1_id || !edition2_id) {
      return res.status(400).json({
        success: false,
        message: 'Les deux IDs d\'édition sont requis'
      });
    }

    const edition1 = await EditionMawlid.findByPk(edition1_id);
    const edition2 = await EditionMawlid.findByPk(edition2_id);

    if (!edition1 || !edition2) {
      return res.status(404).json({
        success: false,
        message: 'Une ou plusieurs éditions introuvables'
      });
    }

    // Fonction helper pour récupérer les stats d'une édition
    const getEditionStats = async (editionId) => {
      const deplacements = await Deplacement.findAll({
        where: { edition_id: editionId }
      });

      const cars = await Car.findAll({
        include: [{
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id: editionId }
        }]
      });

      const carIds = cars.map(c => c.id);
      const incidents = carIds.length > 0
        ? await Incident.findAll({ where: { car_id: { [Op.in]: carIds } } })
        : [];

      const carsAvecDuree = cars.filter(c => c.duree_trajet_minutes !== null);
      const tempsMoyen = carsAvecDuree.length > 0
        ? Math.round(carsAvecDuree.reduce((sum, c) => sum + c.duree_trajet_minutes, 0) / carsAvecDuree.length)
        : 0;

      return {
        deplacements_total: deplacements.length,
        deplacements_aller: deplacements.filter(d => d.type === 'ALLER').length,
        deplacements_retour: deplacements.filter(d => d.type === 'RETOUR').length,
        cars_total: cars.length,
        passagers_total: cars.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0),
        incidents_total: incidents.length,
        incidents_resolus: incidents.filter(i => i.statut_resolution === 'Résolu').length,
        temps_moyen_trajet: tempsMoyen,
        cars_en_retard: cars.filter(c => c.alerte_retard === true).length
      };
    };

    const stats1 = await getEditionStats(edition1_id);
    const stats2 = await getEditionStats(edition2_id);

    // Calculer les évolutions
    const evolution = {
      deplacements: stats2.deplacements_total - stats1.deplacements_total,
      cars: stats2.cars_total - stats1.cars_total,
      passagers: stats2.passagers_total - stats1.passagers_total,
      incidents: stats2.incidents_total - stats1.incidents_total,
      temps_moyen: stats2.temps_moyen_trajet - stats1.temps_moyen_trajet,
      retards: stats2.cars_en_retard - stats1.cars_en_retard
    };

    const pourcentages = {
      deplacements: stats1.deplacements_total > 0 
        ? Math.round((evolution.deplacements / stats1.deplacements_total) * 100) 
        : 0,
      cars: stats1.cars_total > 0 
        ? Math.round((evolution.cars / stats1.cars_total) * 100) 
        : 0,
      passagers: stats1.passagers_total > 0 
        ? Math.round((evolution.passagers / stats1.passagers_total) * 100) 
        : 0,
      incidents: stats1.incidents_total > 0 
        ? Math.round((evolution.incidents / stats1.incidents_total) * 100) 
        : 0
    };

    const comparaison = {
      edition1: {
        id: edition1.id,
        annee: edition1.annee,
        statistiques: stats1
      },
      edition2: {
        id: edition2.id,
        annee: edition2.annee,
        statistiques: stats2
      },
      evolution,
      pourcentages
    };

    res.status(200).json({
      success: true,
      data: comparaison
    });

  } catch (error) {
    logger.error('Erreur comparerEditions:', error);
    next(error);
  }
};

// @desc    Évolution des participants sur plusieurs années
// @route   GET /api/rapports/evolution-participants
// @access  Private
exports.getEvolutionParticipants = async (req, res, next) => {
  try {
    const editions = await EditionMawlid.findAll({
      order: [['annee', 'ASC']]
    });

    const evolution = await Promise.all(
      editions.map(async (edition) => {
        const cars = await Car.findAll({
          include: [{
            model: Deplacement,
            as: 'deplacement',
            where: { edition_id: edition.id }
          }]
        });

        const passagers = cars.reduce((sum, c) => sum + (c.nombre_passagers || 0), 0);
        const sections = await Deplacement.count({
          where: { edition_id: edition.id },
          distinct: true,
          col: 'section_id'
        });

        return {
          annee: edition.annee,
          nombre_passagers: passagers,
          nombre_cars: cars.length,
          nombre_sections: sections,
          moyenne_passagers_par_car: cars.length > 0 
            ? Math.round(passagers / cars.length) 
            : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { evolution }
    });

  } catch (error) {
    logger.error('Erreur getEvolutionParticipants:', error);
    next(error);
  }
};
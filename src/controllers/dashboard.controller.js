const { 
  EditionMawlid, 
  Section, 
  SousLocalite, 
  Deplacement, 
  Car, 
  Incident,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

// @desc    Obtenir les statistiques globales
// @route   GET /api/dashboard/stats
// @access  Private
exports.getStatsGlobales = async (req, res, next) => {
  try {
    const { edition_id } = req.query;

    // Si pas d'edition_id, prendre l'édition active
    let editionCible;
    if (edition_id) {
      editionCible = await EditionMawlid.findByPk(edition_id);
    } else {
      editionCible = await EditionMawlid.findOne({ where: { is_active: true } });
    }

    if (!editionCible) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition trouvée'
      });
    }

    // Statistiques des déplacements
    const totalDeplacements = await Deplacement.count({
      where: { edition_id: editionCible.id }
    });

    const deplacementsAller = await Deplacement.count({
      where: { edition_id: editionCible.id, type: 'ALLER' }
    });

    const deplacementsRetour = await Deplacement.count({
      where: { edition_id: editionCible.id, type: 'RETOUR' }
    });

    const deplacementsTermines = await Deplacement.count({
      where: { edition_id: editionCible.id, statut: 'Terminé' }
    });

    const deplacementsEnCours = await Deplacement.count({
      where: { edition_id: editionCible.id, statut: 'En cours' }
    });

    const deplacementsAvecIncident = await Deplacement.count({
      where: { edition_id: editionCible.id, statut: 'Incident' }
    });

    // Récupérer les IDs des déplacements de cette édition
    const deplacements = await Deplacement.findAll({
      where: { edition_id: editionCible.id },
      attributes: ['id']
    });
    const deplacementIds = deplacements.map(d => d.id);

    // Statistiques des cars
    const totalCars = await Car.count({
      where: { deplacement_id: deplacementIds }
    });

    const carsPrevisPourAller = await Deplacement.sum('nombre_cars_prevus', {
      where: { edition_id: editionCible.id, type: 'ALLER' }
    }) || 0;

    const carsPrevisPourRetour = await Deplacement.sum('nombre_cars_prevus', {
      where: { edition_id: editionCible.id, type: 'RETOUR' }
    }) || 0;

    const carsPartis = await Car.count({
      where: { 
        deplacement_id: deplacementIds,
        heure_depart_effective: { [Op.not]: null }
      }
    });

    const carsArrives = await Car.count({
      where: { 
        deplacement_id: deplacementIds,
        heure_arrivee_effective: { [Op.not]: null }
      }
    });

    const carsEnRoute = await Car.count({
      where: { 
        deplacement_id: deplacementIds,
        statut_temps_reel: {
          [Op.in]: ['En route', 'En route vers Mbour']
        }
      }
    });

    const carsAvecAlerte = await Car.count({
      where: { 
        deplacement_id: deplacementIds,
        alerte_retard: true
      }
    });

    // Statistiques des passagers
    const totalPassagers = await Deplacement.sum('nombre_passagers_total', {
      where: { edition_id: editionCible.id }
    }) || 0;

    // Statistiques des incidents
    const cars = await Car.findAll({
      where: { deplacement_id: deplacementIds },
      attributes: ['id']
    });
    const carIds = cars.map(c => c.id);

    const totalIncidents = await Incident.count({
      where: { car_id: carIds }
    });

    const incidentsEnCours = await Incident.count({
      where: { 
        car_id: carIds,
        statut_resolution: 'En cours'
      }
    });

    const incidentsResolus = await Incident.count({
      where: { 
        car_id: carIds,
        statut_resolution: 'Résolu'
      }
    });

    // Statistiques par statut de car
    const carsParStatut = await Car.findAll({
      where: { deplacement_id: deplacementIds },
      attributes: [
        'statut_temps_reel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['statut_temps_reel'],
      raw: true
    });

    const statsParStatut = {};
    carsParStatut.forEach(item => {
      statsParStatut[item.statut_temps_reel] = parseInt(item.count);
    });

    // Calculer les pourcentages
    const pourcentageDeplacementsTermines = totalDeplacements > 0 
      ? Math.round((deplacementsTermines / totalDeplacements) * 100) 
      : 0;

    const pourcentageCarsArrives = totalCars > 0 
      ? Math.round((carsArrives / totalCars) * 100) 
      : 0;

    const stats = {
      edition: {
        id: editionCible.id,
        annee: editionCible.annee,
        date_mawlid: editionCible.date_mawlid,
        statut: editionCible.statut
      },
      deplacements: {
        total: totalDeplacements,
        aller: deplacementsAller,
        retour: deplacementsRetour,
        termines: deplacementsTermines,
        en_cours: deplacementsEnCours,
        avec_incident: deplacementsAvecIncident,
        pourcentage_termines: pourcentageDeplacementsTermines
      },
      cars: {
        total: totalCars,
        prevus_aller: carsPrevisPourAller,
        prevus_retour: carsPrevisPourRetour,
        partis: carsPartis,
        arrives: carsArrives,
        en_route: carsEnRoute,
        avec_alerte: carsAvecAlerte,
        pourcentage_arrives: pourcentageCarsArrives,
        par_statut: statsParStatut
      },
      passagers: {
        total: totalPassagers
      },
      incidents: {
        total: totalIncidents,
        en_cours: incidentsEnCours,
        resolus: incidentsResolus
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

// @desc    Obtenir les statistiques par sous-localité
// @route   GET /api/dashboard/stats/by-sous-localite
// @access  Private
exports.getStatsBySousLocalite = async (req, res, next) => {
  try {
    const { edition_id } = req.query;

    // Récupérer l'édition
    let editionCible;
    if (edition_id) {
      editionCible = await EditionMawlid.findByPk(edition_id);
    } else {
      editionCible = await EditionMawlid.findOne({ where: { is_active: true } });
    }

    if (!editionCible) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition trouvée'
      });
    }

    // Récupérer toutes les sous-localités
    const sousLocalites = await SousLocalite.findAll({
      order: [['ordre_affichage', 'ASC']]
    });

    const statsBySousLocalite = [];

    for (const sl of sousLocalites) {
      // Récupérer les sections de cette sous-localité
      const sections = await Section.findAll({
        where: { sous_localite_id: sl.id },
        attributes: ['id']
      });
      const sectionIds = sections.map(s => s.id);

      // Déplacements
      const deplacements = await Deplacement.findAll({
        where: { 
          edition_id: editionCible.id,
          section_id: sectionIds
        },
        attributes: ['id']
      });
      const deplacementIds = deplacements.map(d => d.id);

      const nombreDeplacements = deplacements.length;
      
      // Cars
      const cars = await Car.findAll({
        where: { deplacement_id: deplacementIds },
        attributes: ['id', 'nombre_passagers', 'alerte_retard']
      });

      const nombreCars = cars.length;
      const totalPassagers = cars.reduce((sum, car) => sum + car.nombre_passagers, 0);
      const carsAvecAlerte = cars.filter(c => c.alerte_retard).length;

      // Incidents
      const carIds = cars.map(c => c.id);
      const nombreIncidents = await Incident.count({
        where: { car_id: carIds }
      });

      statsBySousLocalite.push({
        sous_localite: {
          id: sl.id,
          code: sl.code,
          nom: sl.nom
        },
        nombre_sections: sections.length,
        nombre_deplacements: nombreDeplacements,
        nombre_cars: nombreCars,
        total_passagers: totalPassagers,
        cars_avec_alerte: carsAvecAlerte,
        nombre_incidents: nombreIncidents
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        edition: editionCible,
        stats: statsBySousLocalite 
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le statut des cars en temps réel
// @route   GET /api/dashboard/cars-realtime
// @access  Private
exports.getCarsRealtime = async (req, res, next) => {
  try {
    // Récupérer l'édition active
    const editionActive = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!editionActive) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition active trouvée'
      });
    }

    // Récupérer tous les cars de l'édition active avec leurs infos
    const cars = await Car.findAll({
      include: [
        {
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id: editionActive.id },
          include: [
            {
              model: Section,
              as: 'section',
              include: [{
                model: SousLocalite,
                as: 'sousLocalite',
                attributes: ['id', 'code', 'nom']
              }]
            }
          ]
        },
        {
          model: Incident,
          as: 'incidents',
          where: { statut_resolution: 'En cours' },
          required: false
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    // Grouper par statut pour affichage visuel
    const carsByStatut = {
      'À Mbour': [],
      'En route': [],
      'Arrivé à Tivaouane': [],
      'À Tivaouane': [],
      'En route vers Mbour': [],
      'Arrivé à Mbour': [],
      'Incident': []
    };

    cars.forEach(car => {
      carsByStatut[car.statut_temps_reel].push({
        id: car.id,
        numero_car: car.numero_car,
        section: car.deplacement.section.nom,
        sous_localite: car.deplacement.section.sousLocalite.code,
        type_deplacement: car.deplacement.type,
        nombre_passagers: car.nombre_passagers,
        responsable: car.responsable_car,
        contact: car.contact_responsable,
        heure_depart: car.heure_depart_effective,
        heure_arrivee: car.heure_arrivee_effective,
        duree_trajet: car.duree_trajet_minutes,
        alerte_retard: car.alerte_retard,
        a_incident: car.incidents.length > 0
      });
    });

    // Compteurs
    const compteurs = {
      total: cars.length,
      'À Mbour': carsByStatut['À Mbour'].length,
      'En route': carsByStatut['En route'].length,
      'Arrivé à Tivaouane': carsByStatut['Arrivé à Tivaouane'].length,
      'À Tivaouane': carsByStatut['À Tivaouane'].length,
      'En route vers Mbour': carsByStatut['En route vers Mbour'].length,
      'Arrivé à Mbour': carsByStatut['Arrivé à Mbour'].length,
      'Incident': carsByStatut['Incident'].length,
      avec_alerte: cars.filter(c => c.alerte_retard).length
    };

    res.status(200).json({
      success: true,
      data: {
        edition: editionActive,
        cars: carsByStatut,
        compteurs,
        derniere_mise_a_jour: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir la timeline des départs et arrivées
// @route   GET /api/dashboard/timeline
// @access  Private
exports.getTimeline = async (req, res, next) => {
  try {
    const { edition_id } = req.query;

    let editionCible;
    if (edition_id) {
      editionCible = await EditionMawlid.findByPk(edition_id);
    } else {
      editionCible = await EditionMawlid.findOne({ where: { is_active: true } });
    }

    if (!editionCible) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition trouvée'
      });
    }

    // Récupérer tous les événements (départs et arrivées)
    const cars = await Car.findAll({
      include: [{
        model: Deplacement,
        as: 'deplacement',
        where: { edition_id: editionCible.id },
        include: [{
          model: Section,
          as: 'section',
          include: [{
            model: SousLocalite,
            as: 'sousLocalite'
          }]
        }]
      }],
      where: {
        [Op.or]: [
          { heure_depart_effective: { [Op.not]: null } },
          { heure_arrivee_effective: { [Op.not]: null } }
        ]
      }
    });

    const timeline = [];

    cars.forEach(car => {
      if (car.heure_depart_effective) {
        timeline.push({
          type: 'DEPART',
          heure: car.heure_depart_effective,
          car_id: car.id,
          numero_car: car.numero_car,
          section: car.deplacement.section.nom,
          sous_localite: car.deplacement.section.sousLocalite.code,
          type_deplacement: car.deplacement.type,
          nombre_passagers: car.nombre_passagers
        });
      }

      if (car.heure_arrivee_effective) {
        timeline.push({
          type: 'ARRIVEE',
          heure: car.heure_arrivee_effective,
          car_id: car.id,
          numero_car: car.numero_car,
          section: car.deplacement.section.nom,
          sous_localite: car.deplacement.section.sousLocalite.code,
          type_deplacement: car.deplacement.type,
          nombre_passagers: car.nombre_passagers,
          duree_trajet: car.duree_trajet_minutes
        });
      }
    });

    // Trier par heure
    timeline.sort((a, b) => new Date(b.heure) - new Date(a.heure));

    res.status(200).json({
      success: true,
      data: {
        edition: editionCible,
        timeline,
        total_evenements: timeline.length
      }
    });

  } catch (error) {
    next(error);
  }
};
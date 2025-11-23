const { Car, Deplacement, Section, SousLocalite, EditionMawlid, Incident } = require('../models');
const logger = require('../utils/logger');

/**
 * ✅ FONCTION UTILITAIRE : Mettre à jour automatiquement le statut d'un déplacement
 * selon le statut de ses cars
 */
async function updateDeplacementStatut(deplacementId) {
  try {
    const deplacement = await Deplacement.findByPk(deplacementId);
    if (!deplacement) return;

    // Récupérer tous les cars actifs du déplacement
    const cars = await Car.findAll({
      where: { deplacement_id: deplacementId }
    });

    if (cars.length === 0) {
      // Aucun car : statut reste "Non commencé"
      deplacement.statut = 'Non commencé';
    } else {
      // Vérifier s'il y a un incident
      const hasIncident = cars.some(car => car.statut_temps_reel === 'Incident');
      
      if (hasIncident) {
        deplacement.statut = 'Incident';
      } else {
        // Vérifier si tous les cars sont arrivés
        const allArrived = cars.every(car => 
          car.statut_temps_reel === 'Arrivé à Tivaouane' || 
          car.statut_temps_reel === 'Arrivé à Mbour'
        );

        if (allArrived) {
          deplacement.statut = 'Terminé';
        } else {
          // Vérifier si au moins un car est parti ou en route
          const someStarted = cars.some(car => 
            car.statut_temps_reel === 'En route' || 
            car.statut_temps_reel === 'En route vers Mbour' ||
            car.statut_temps_reel === 'Arrivé à Tivaouane' ||
            car.statut_temps_reel === 'À Tivaouane'
          );

          deplacement.statut = someStarted ? 'En cours' : 'Non commencé';
        }
      }
    }

    await deplacement.save();
    logger.info(`✅ Statut du déplacement ${deplacementId} mis à jour automatiquement: ${deplacement.statut}`);
  } catch (error) {
    logger.error(`❌ Erreur mise à jour statut déplacement ${deplacementId}:`, error);
  }
}

// @desc    Obtenir tous les cars
// @route   GET /api/cars
// @access  Private
exports.getAllCars = async (req, res, next) => {
  try {
    const { deplacement_id, statut_temps_reel, alerte_retard } = req.query;
    
    const whereClause = {};
    if (deplacement_id) whereClause.deplacement_id = deplacement_id;
    if (statut_temps_reel) whereClause.statut_temps_reel = statut_temps_reel;
    if (alerte_retard !== undefined) whereClause.alerte_retard = alerte_retard === 'true';

    const cars = await Car.findAll({
      where: whereClause,
      include: [
        {
          model: Deplacement,
          as: 'deplacement',
          include: [
            {
              model: Section,
              as: 'section',
              include: [{
                model: SousLocalite,
                as: 'sousLocalite',
                attributes: ['id', 'code', 'nom']
              }]
            },
            {
              model: EditionMawlid,
              as: 'edition',
              attributes: ['id', 'annee']
            }
          ]
        },
        {
          model: Incident,
          as: 'incidents'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: cars.length,
      data: { cars }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les cars en temps réel (édition active)
// @route   GET /api/cars/temps-reel
// @access  Private
exports.getCarsTempsReel = async (req, res, next) => {
  try {
    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!activeEdition) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition active trouvée'
      });
    }

    const cars = await Car.findAll({
      include: [
        {
          model: Deplacement,
          as: 'deplacement',
          where: { edition_id: activeEdition.id },
          include: [
            {
              model: Section,
              as: 'section',
              include: [{
                model: SousLocalite,
                as: 'sousLocalite'
              }]
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    // Grouper par statut
    const carsByStatus = {
      'À Mbour': cars.filter(c => c.statut_temps_reel === 'À Mbour'),
      'En route': cars.filter(c => c.statut_temps_reel === 'En route'),
      'Arrivé à Tivaouane': cars.filter(c => c.statut_temps_reel === 'Arrivé à Tivaouane'),
      'À Tivaouane': cars.filter(c => c.statut_temps_reel === 'À Tivaouane'),
      'En route vers Mbour': cars.filter(c => c.statut_temps_reel === 'En route vers Mbour'),
      'Arrivé à Mbour': cars.filter(c => c.statut_temps_reel === 'Arrivé à Mbour'),
      'Incident': cars.filter(c => c.statut_temps_reel === 'Incident')
    };

    const stats = {
      total: cars.length,
      avec_alerte: cars.filter(c => c.alerte_retard).length,
      par_statut: {
        'À Mbour': carsByStatus['À Mbour'].length,
        'En route': carsByStatus['En route'].length,
        'Arrivé à Tivaouane': carsByStatus['Arrivé à Tivaouane'].length,
        'À Tivaouane': carsByStatus['À Tivaouane'].length,
        'En route vers Mbour': carsByStatus['En route vers Mbour'].length,
        'Arrivé à Mbour': carsByStatus['Arrivé à Mbour'].length,
        'Incident': carsByStatus['Incident'].length
      }
    };

    res.status(200).json({
      success: true,
      data: { 
        edition: activeEdition,
        cars,
        carsByStatus,
        stats
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un car par ID
// @route   GET /api/cars/:id
// @access  Private
exports.getCarById = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id, {
      include: [
        {
          model: Deplacement,
          as: 'deplacement',
          include: [
            { model: Section, as: 'section' },
            { model: EditionMawlid, as: 'edition' }
          ]
        },
        {
          model: Incident,
          as: 'incidents'
        }
      ]
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: { car }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau car
// @route   POST /api/cars
// @access  Private (Super Admin)
exports.createCar = async (req, res, next) => {
  try {
    const {
      deplacement_id,
      numero_car,
      nombre_passagers,
      route_empruntee,
      responsable_car,
      contact_responsable,
      immatriculation,
      nom_chauffeur,
      contact_chauffeur
    } = req.body;

    // Vérifier que le déplacement existe
    const deplacement = await Deplacement.findByPk(deplacement_id);
    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    const car = await Car.create({
      deplacement_id,
      numero_car,
      nombre_passagers,
      route_empruntee,
      responsable_car,
      contact_responsable,
      immatriculation,
      nom_chauffeur,
      contact_chauffeur,
      statut_temps_reel: 'À Mbour'
    });

    logger.info(`Nouveau car créé: ${numero_car} pour déplacement ${deplacement_id} par ${req.user.email}`);

    // ✅ METTRE À JOUR LE STATUT DU DÉPLACEMENT
    await updateDeplacementStatut(deplacement_id);

    // Récupérer avec les relations
    const carComplet = await Car.findByPk(car.id, {
      include: [
        {
          model: Deplacement,
          as: 'deplacement',
          include: [
            { model: Section, as: 'section' },
            { model: EditionMawlid, as: 'edition' }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Car créé avec succès',
      data: { car: carComplet }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un car
// @route   PUT /api/cars/:id
// @access  Private (Super Admin)
exports.updateCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    const {
      numero_car,
      nombre_passagers,
      route_empruntee,
      responsable_car,
      contact_responsable,
      immatriculation,
      nom_chauffeur,
      contact_chauffeur
    } = req.body;

    if (numero_car) car.numero_car = numero_car;
    if (nombre_passagers) car.nombre_passagers = nombre_passagers;
    if (route_empruntee) car.route_empruntee = route_empruntee;
    if (responsable_car) car.responsable_car = responsable_car;
    if (contact_responsable) car.contact_responsable = contact_responsable;
    if (immatriculation !== undefined) car.immatriculation = immatriculation;
    if (nom_chauffeur !== undefined) car.nom_chauffeur = nom_chauffeur;
    if (contact_chauffeur !== undefined) car.contact_chauffeur = contact_chauffeur;

    await car.save();

    logger.info(`Car ${car.id} mis à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Car mis à jour avec succès',
      data: { car }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour le statut d'un car
// @route   PUT /api/cars/:id/status
// @access  Private (Super Admin)
exports.updateCarStatus = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    const { 
      statut_temps_reel, 
      heure_depart_effective, 
      heure_arrivee_effective 
    } = req.body;

    if (statut_temps_reel) {
      car.statut_temps_reel = statut_temps_reel;
    }

    if (heure_depart_effective) {
      car.heure_depart_effective = new Date(heure_depart_effective);
    }

    if (heure_arrivee_effective) {
      car.heure_arrivee_effective = new Date(heure_arrivee_effective);
    }

    await car.save();

    // ✅ METTRE À JOUR LE STATUT DU DÉPLACEMENT
    await updateDeplacementStatut(car.deplacement_id);

    logger.info(`Statut du car ${car.id} mis à jour: ${statut_temps_reel} par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Statut du car mis à jour avec succès',
      data: { car }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Enregistrer le départ d'un car
// @route   PUT /api/cars/:id/depart
// @access  Private (Super Admin)
exports.enregistrerDepart = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    car.heure_depart_effective = new Date();
    car.statut_temps_reel = 'En route';

    await car.save();

    // ✅ METTRE À JOUR LE STATUT DU DÉPLACEMENT (doit passer à "En cours")
    await updateDeplacementStatut(car.deplacement_id);

    logger.info(`Départ enregistré pour le car ${car.id} par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Départ enregistré avec succès',
      data: { car }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Enregistrer l'arrivée d'un car
// @route   PUT /api/cars/:id/arrivee
// @access  Private (Super Admin)
exports.enregistrerArrivee = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id, {
      include: [{
        model: Deplacement,
        as: 'deplacement'
      }]
    });

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    car.heure_arrivee_effective = new Date();
    
    // Définir le statut selon le type de déplacement
    if (car.deplacement.type === 'ALLER') {
      car.statut_temps_reel = 'Arrivé à Tivaouane';
    } else {
      car.statut_temps_reel = 'Arrivé à Mbour';
    }

    await car.save();

    // ✅ METTRE À JOUR LE STATUT DU DÉPLACEMENT (peut passer à "Terminé" si tous arrivés)
    await updateDeplacementStatut(car.deplacement_id);

    logger.info(`Arrivée enregistrée pour le car ${car.id} par ${req.user.email}`);

    // Vérifier si c'est le dernier car du déplacement
    const totalCars = await Car.count({
      where: { deplacement_id: car.deplacement_id }
    });

    const carsArrives = await Car.count({
      where: { 
        deplacement_id: car.deplacement_id,
        heure_arrivee_effective: { [require('sequelize').Op.not]: null }
      }
    });

    const tousArrives = totalCars === carsArrives;

    res.status(200).json({
      success: true,
      message: 'Arrivée enregistrée avec succès',
      data: { 
        car,
        tousArrives,
        progression: `${carsArrives}/${totalCars}`
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un car
// @route   DELETE /api/cars/:id
// @access  Private (Super Admin)
exports.deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car introuvable'
      });
    }

    const deplacementId = car.deplacement_id;

    await car.destroy();

    // ✅ METTRE À JOUR LE STATUT DU DÉPLACEMENT (peut revenir à "Non commencé" si c'était le seul car)
    await updateDeplacementStatut(deplacementId);

    logger.info(`Car ${car.id} supprimé par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Car supprimé avec succès'
    });

  } catch (error) {
    next(error);
  }
};
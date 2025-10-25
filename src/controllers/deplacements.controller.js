const { Deplacement, Section, EditionMawlid, Car, SousLocalite } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir tous les déplacements
// @route   GET /api/deplacements
// @access  Private
exports.getAllDeplacements = async (req, res, next) => {
  try {
    const { edition_id, section_id, type, statut } = req.query;
    
    const whereClause = {};
    if (edition_id) whereClause.edition_id = edition_id;
    if (section_id) whereClause.section_id = section_id;
    if (type) whereClause.type = type;
    if (statut) whereClause.statut = statut;

    const deplacements = await Deplacement.findAll({
      where: whereClause,
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
          attributes: ['id', 'annee', 'date_mawlid']
        },
        {
          model: Car,
          as: 'cars'
        }
      ],
      order: [['date_prevue', 'ASC'], ['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: deplacements.length,
      data: { deplacements }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les déplacements de l'édition active
// @route   GET /api/deplacements/active-edition
// @access  Private
exports.getDeplacementsActiveEdition = async (req, res, next) => {
  try {
    const { type, statut } = req.query;

    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!activeEdition) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition active trouvée'
      });
    }

    const whereClause = { edition_id: activeEdition.id };
    if (type) whereClause.type = type;
    if (statut) whereClause.statut = statut;

    const deplacements = await Deplacement.findAll({
      where: whereClause,
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
          model: Car,
          as: 'cars'
        }
      ],
      order: [['date_prevue', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: deplacements.length,
      data: { 
        edition: activeEdition,
        deplacements 
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir un déplacement par ID
// @route   GET /api/deplacements/:id
// @access  Private
exports.getDeplacementById = async (req, res, next) => {
  try {
    const deplacement = await Deplacement.findByPk(req.params.id, {
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
          as: 'cars'
        }
      ]
    });

    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: { deplacement }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Créer un nouveau déplacement
// @route   POST /api/deplacements
// @access  Private (Super Admin)
exports.createDeplacement = async (req, res, next) => {
  try {
    const {
      section_id,
      edition_id,
      type,
      date_prevue,
      heure_prevue,
      nombre_cars_prevus,
      commentaire
    } = req.body;

    // Vérifier que la section existe
    const section = await Section.findByPk(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section introuvable'
      });
    }

    // Vérifier que l'édition existe
    const edition = await EditionMawlid.findByPk(edition_id);
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    // Vérifier qu'il n'existe pas déjà un déplacement du même type
    const existingDeplacement = await Deplacement.findOne({
      where: { section_id, edition_id, type }
    });

    if (existingDeplacement) {
      return res.status(400).json({
        success: false,
        message: `Un déplacement ${type} existe déjà pour cette section dans cette édition`
      });
    }

    const deplacement = await Deplacement.create({
      section_id,
      edition_id,
      type,
      date_prevue,
      heure_prevue,
      nombre_cars_prevus,
      commentaire,
      statut: 'Non commencé'
    });

    logger.info(`Nouveau déplacement créé: Section ${section.nom} - ${type} par ${req.user.email}`);

    // Récupérer le déplacement avec les relations
    const deplacementComplet = await Deplacement.findByPk(deplacement.id, {
      include: [
        { model: Section, as: 'section' },
        { model: EditionMawlid, as: 'edition' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Déplacement créé avec succès',
      data: { deplacement: deplacementComplet }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour un déplacement
// @route   PUT /api/deplacements/:id
// @access  Private (Super Admin)
exports.updateDeplacement = async (req, res, next) => {
  try {
    const deplacement = await Deplacement.findByPk(req.params.id);

    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    const {
      date_prevue,
      heure_prevue,
      nombre_cars_prevus,
      statut,
      commentaire
    } = req.body;

    if (date_prevue) deplacement.date_prevue = date_prevue;
    if (heure_prevue !== undefined) deplacement.heure_prevue = heure_prevue;
    if (nombre_cars_prevus) deplacement.nombre_cars_prevus = nombre_cars_prevus;
    if (statut) deplacement.statut = statut;
    if (commentaire !== undefined) deplacement.commentaire = commentaire;

    await deplacement.save();

    logger.info(`Déplacement ${deplacement.id} mis à jour par ${req.user.email}`);

    // Récupérer avec les relations
    const deplacementComplet = await Deplacement.findByPk(deplacement.id, {
      include: [
        { model: Section, as: 'section' },
        { model: EditionMawlid, as: 'edition' },
        { model: Car, as: 'cars' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Déplacement mis à jour avec succès',
      data: { deplacement: deplacementComplet }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer un déplacement
// @route   DELETE /api/deplacements/:id
// @access  Private (Super Admin)
exports.deleteDeplacement = async (req, res, next) => {
  try {
    const deplacement = await Deplacement.findByPk(req.params.id);

    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    // Vérifier s'il y a des cars associés
    const carsCount = await Car.count({
      where: { deplacement_id: deplacement.id }
    });

    if (carsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un déplacement contenant des cars'
      });
    }

    await deplacement.destroy();

    logger.info(`Déplacement ${deplacement.id} supprimé par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Déplacement supprimé avec succès'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques d'un déplacement
// @route   GET /api/deplacements/:id/stats
// @access  Private
exports.getDeplacementStats = async (req, res, next) => {
  try {
    const deplacement = await Deplacement.findByPk(req.params.id, {
      include: [
        {
          model: Car,
          as: 'cars'
        }
      ]
    });

    if (!deplacement) {
      return res.status(404).json({
        success: false,
        message: 'Déplacement introuvable'
      });
    }

    const stats = {
      nombre_cars_prevus: deplacement.nombre_cars_prevus,
      nombre_cars_enregistres: deplacement.cars.length,
      nombre_passagers_total: deplacement.nombre_passagers_total,
      cars_partis: deplacement.cars.filter(c => c.heure_depart_effective !== null).length,
      cars_arrives: deplacement.cars.filter(c => c.heure_arrivee_effective !== null).length,
      cars_en_route: deplacement.cars.filter(c => 
        c.statut_temps_reel === 'En route' || 
        c.statut_temps_reel === 'En route vers Mbour'
      ).length,
      cars_avec_incident: deplacement.cars.filter(c => c.statut_temps_reel === 'Incident').length,
      cars_avec_alerte: deplacement.cars.filter(c => c.alerte_retard === true).length
    };

    res.status(200).json({
      success: true,
      data: { 
        deplacement,
        stats 
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les déplacements d'une édition spécifique
// @route   GET /api/deplacements/edition/:editionId
// @access  Private
exports.getDeplacementsByEdition = async (req, res, next) => {
  try {
    const { editionId } = req.params;
    const { type, statut } = req.query;

    // Vérifier que l'édition existe
    const edition = await EditionMawlid.findByPk(editionId);
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    const whereClause = { edition_id: editionId };
    if (type) whereClause.type = type;
    if (statut) whereClause.statut = statut;

    const deplacements = await Deplacement.findAll({
      where: whereClause,
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
          model: Car,
          as: 'cars'
        }
      ],
      order: [['date_prevue', 'ASC'], ['type', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: deplacements.length,
      data: { 
        edition,
        deplacements 
      }
    });

  } catch (error) {
    next(error);
  }
};

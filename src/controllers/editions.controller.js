const { EditionMawlid, User, Deplacement } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir toutes les éditions
// @route   GET /api/editions
// @access  Private
exports.getAllEditions = async (req, res, next) => {
  try {
    const { statut, annee } = req.query;
    
    const whereClause = {};
    if (statut) whereClause.statut = statut;
    if (annee) whereClause.annee = annee;

    const editions = await EditionMawlid.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'nom', 'prenom', 'email']
      }],
      order: [['annee', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: editions.length,
      data: { editions }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une édition par ID
// @route   GET /api/editions/:id
// @access  Private
exports.getEditionById = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'nom', 'prenom', 'email']
      }]
    });

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir l'édition active
// @route   GET /api/editions/active
// @access  Private
exports.getActiveEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findOne({
      where: { is_active: true },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'nom', 'prenom', 'email']
      }]
    });

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Aucune édition active trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle édition
// @route   POST /api/editions
// @access  Private (Super Admin)
exports.createEdition = async (req, res, next) => {
  try {
    const { annee, date_mawlid, date_debut_periode, date_fin_periode, description } = req.body;

    const existingEdition = await EditionMawlid.findOne({ where: { annee } });
    if (existingEdition) {
      return res.status(400).json({
        success: false,
        message: `Une édition pour l'année ${annee} existe déjà`
      });
    }

    const edition = await EditionMawlid.create({
      annee,
      date_mawlid,
      date_debut_periode,
      date_fin_periode,
      description,
      created_by: req.user.id,
      statut: 'Planifiée'
    });

    logger.info(`Nouvelle édition créée: ${annee} par ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Édition créée avec succès',
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une édition
// @route   PUT /api/editions/:id
// @access  Private (Super Admin)
exports.updateEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id);

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    if (edition.statut === 'Archivée') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier une édition archivée'
      });
    }

    const { annee, date_mawlid, date_debut_periode, date_fin_periode, description, statut } = req.body;

    if (annee) edition.annee = annee;
    if (date_mawlid) edition.date_mawlid = date_mawlid;
    if (date_debut_periode) edition.date_debut_periode = date_debut_periode;
    if (date_fin_periode) edition.date_fin_periode = date_fin_periode;
    if (description !== undefined) edition.description = description;
    if (statut) edition.statut = statut;

    await edition.save();

    logger.info(`Édition ${edition.annee} mise à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Édition mise à jour avec succès',
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Activer une édition
// @route   PUT /api/editions/:id/activate
// @access  Private (Super Admin)
exports.activateEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id);

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    // Désactiver toutes les autres éditions
    await EditionMawlid.update(
      { is_active: false },
      { where: { is_active: true } }
    );

    // Activer l'édition sélectionnée
    edition.is_active = true;
    edition.statut = 'En cours';
    await edition.save();

    logger.info(`Édition ${edition.annee} activée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Édition ${edition.annee} activée avec succès`,
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Clôturer une édition
// @route   PUT /api/editions/:id/close
// @access  Private (Super Admin)
exports.closeEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id);

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    edition.statut = 'Terminée';
    edition.is_active = false;
    await edition.save();

    logger.info(`Édition ${edition.annee} clôturée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Édition clôturée avec succès',
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Archiver une édition
// @route   PUT /api/editions/:id/archive
// @access  Private (Super Admin)
exports.archiveEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id);

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    edition.statut = 'Archivée';
    edition.is_active = false;
    await edition.save();

    logger.info(`Édition ${edition.annee} archivée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Édition archivée avec succès',
      data: { edition }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une édition
// @route   DELETE /api/editions/:id
// @access  Private (Super Admin)
exports.deleteEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.id);

    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    const deplacementsCount = await Deplacement.count({
      where: { edition_id: edition.id }
    });

    if (deplacementsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une édition contenant des déplacements'
      });
    }

    await edition.destroy();

    logger.info(`Édition ${edition.annee} supprimée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Édition supprimée avec succès'
    });

  } catch (error) {
    next(error);
  }
};
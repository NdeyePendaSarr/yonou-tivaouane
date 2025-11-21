// ==========================================
// FICHIER 1 : backend/src/controllers/sousLocalites.controller.js
// ==========================================

const { SousLocalite, Section } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir toutes les sous-localités
// @route   GET /api/sous-localites
// @access  Private
exports.getAllSousLocalites = async (req, res, next) => {
  try {
    const sousLocalites = await SousLocalite.findAll({
      include: [{
        model: Section,
        as: 'sections',
        attributes: ['id', 'nom', 'is_active']
      }],
      order: [['ordre_affichage', 'ASC']]
    });

    // Enrichir avec le comptage des sections
    const enrichedData = sousLocalites.map(sl => {
      const sections = sl.sections || [];
      return {
        id: sl.id,
        code: sl.code,
        nom: sl.nom,
        description: sl.description,
        ordre_affichage: sl.ordre_affichage,
        created_at: sl.created_at,
        updated_at: sl.updated_at,
        nombre_sections: sections.length,
        sections_actives: sections.filter(s => s.is_active).length
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedData.length,
      data: enrichedData
    });

  } catch (error) {
    logger.error('Erreur getAllSousLocalites:', error);
    next(error);
  }
};

// @desc    Obtenir une sous-localité par ID
// @route   GET /api/sous-localites/:id
// @access  Private
exports.getSousLocaliteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sousLocalite = await SousLocalite.findByPk(id, {
      include: [{
        model: Section,
        as: 'sections',
        order: [['ordre_affichage', 'ASC']]
      }]
    });

    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: sousLocalite
    });

  } catch (error) {
    logger.error('Erreur getSousLocaliteById:', error);
    next(error);
  }
};

// @desc    Créer une nouvelle sous-localité
// @route   POST /api/sous-localites
// @access  Private (Super Admin)
exports.createSousLocalite = async (req, res, next) => {
  try {
    const { code, nom, description, ordre_affichage } = req.body;

    // Validation
    if (!code || !nom || !ordre_affichage) {
      return res.status(400).json({
        success: false,
        message: 'Les champs code, nom et ordre_affichage sont obligatoires'
      });
    }

    // Vérifier que le code est valide (A-Z)
    if (!/^[A-Z]$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit être une lettre majuscule unique (A-Z)'
      });
    }

    // Vérifier que le code n'existe pas déjà
    const existingSousLocalite = await SousLocalite.findOne({
      where: { code }
    });

    if (existingSousLocalite) {
      return res.status(409).json({
        success: false,
        message: `Une sous-localité avec le code "${code}" existe déjà`
      });
    }

    // Créer la sous-localité
    const sousLocalite = await SousLocalite.create({
      code,
      nom,
      description: description || null,
      ordre_affichage
    });

    logger.info(`Nouvelle sous-localité créée: ${nom} (${code}) par ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Sous-localité créée avec succès',
      data: sousLocalite
    });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Cette sous-localité existe déjà'
      });
    }
    logger.error('Erreur createSousLocalite:', error);
    next(error);
  }
};

// @desc    Mettre à jour une sous-localité
// @route   PUT /api/sous-localites/:id
// @access  Private (Super Admin)
exports.updateSousLocalite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nom, description, ordre_affichage } = req.body;

    const sousLocalite = await SousLocalite.findByPk(id);

    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    // Mise à jour
    if (nom !== undefined) sousLocalite.nom = nom;
    if (description !== undefined) sousLocalite.description = description;
    if (ordre_affichage !== undefined) sousLocalite.ordre_affichage = ordre_affichage;

    await sousLocalite.save();

    logger.info(`Sous-localité ${sousLocalite.nom} mise à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sous-localité mise à jour avec succès',
      data: sousLocalite
    });

  } catch (error) {
    logger.error('Erreur updateSousLocalite:', error);
    next(error);
  }
};

// @desc    Supprimer une sous-localité
// @route   DELETE /api/sous-localites/:id
// @access  Private (Super Admin)
exports.deleteSousLocalite = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sousLocalite = await SousLocalite.findByPk(id);

    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    // Vérifier s'il y a des sections associées
    const sectionsCount = await Section.count({
      where: { sous_localite_id: id }
    });

    if (sectionsCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer cette sous-localité car elle contient des sections'
      });
    }

    const sousLocaliteNom = sousLocalite.nom;
    await sousLocalite.destroy();

    logger.info(`Sous-localité ${sousLocaliteNom} supprimée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sous-localité supprimée avec succès'
    });

  } catch (error) {
    logger.error('Erreur deleteSousLocalite:', error);
    next(error);
  }
};
const { Section, SousLocalite } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir toutes les sections
// @route   GET /api/sections
// @access  Private
exports.getAllSections = async (req, res, next) => {
  try {
    const { sous_localite_id, is_active } = req.query;
    
    const whereClause = {};
    if (sous_localite_id) whereClause.sous_localite_id = sous_localite_id;
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';

    const sections = await Section.findAll({
      where: whereClause,
      include: [{
        model: SousLocalite,
        as: 'sousLocalite',
        attributes: ['id', 'code', 'nom']
      }],
      order: [['sous_localite_id', 'ASC'], ['ordre_affichage', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: { sections }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les sections par sous-localité
// @route   GET /api/sections/by-sous-localite/:code
// @access  Private
exports.getSectionsBySousLocalite = async (req, res, next) => {
  try {
    const { code } = req.params;

    const sousLocalite = await SousLocalite.findOne({
      where: { code: code.toUpperCase() }
    });

    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    const sections = await Section.findAll({
      where: { sous_localite_id: sousLocalite.id },
      include: [{
        model: SousLocalite,
        as: 'sousLocalite'
      }],
      order: [['ordre_affichage', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: sections.length,
      data: { 
        sousLocalite,
        sections 
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir une section par ID
// @route   GET /api/sections/:id
// @access  Private
exports.getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id, {
      include: [{
        model: SousLocalite,
        as: 'sousLocalite'
      }]
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: { section }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Créer une nouvelle section
// @route   POST /api/sections
// @access  Private (Super Admin)
exports.createSection = async (req, res, next) => {
  try {
    const { 
      nom, 
      sous_localite_id, 
      president_nom, 
      president_telephone, 
      president_email,
      ordre_affichage 
    } = req.body;

    const sousLocalite = await SousLocalite.findByPk(sous_localite_id);
    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    const section = await Section.create({
      nom,
      sous_localite_id,
      president_nom,
      president_telephone,
      president_email,
      ordre_affichage
    });

    logger.info(`Nouvelle section créée: ${nom} par ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Section créée avec succès',
      data: { section }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Mettre à jour une section
// @route   PUT /api/sections/:id
// @access  Private (Super Admin)
exports.updateSection = async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section introuvable'
      });
    }

    const { 
      nom, 
      president_nom, 
      president_telephone, 
      president_email,
      ordre_affichage,
      is_active
    } = req.body;

    if (nom) section.nom = nom;
    if (president_nom !== undefined) section.president_nom = president_nom;
    if (president_telephone !== undefined) section.president_telephone = president_telephone;
    if (president_email !== undefined) section.president_email = president_email;
    if (ordre_affichage) section.ordre_affichage = ordre_affichage;
    if (is_active !== undefined) section.is_active = is_active;

    await section.save();

    logger.info(`Section ${section.nom} mise à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Section mise à jour avec succès',
      data: { section }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une section
// @route   DELETE /api/sections/:id
// @access  Private (Super Admin)
exports.deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section introuvable'
      });
    }

    await section.destroy();

    logger.info(`Section ${section.nom} supprimée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Section supprimée avec succès'
    });

  } catch (error) {
    next(error);
  }
};
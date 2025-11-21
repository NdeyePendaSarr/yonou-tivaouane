// ==========================================
// FICHIER : backend/controllers/sections.controller.js
// VERSION COMPLÈTE avec toutes les méthodes
// ==========================================

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

// @desc    Obtenir les sections par sous-localité (par code)
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

    // Validation
    if (!nom || !sous_localite_id) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et la sous-localité sont obligatoires'
      });
    }

    // Vérifier que la sous-localité existe
    const sousLocalite = await SousLocalite.findByPk(sous_localite_id);
    if (!sousLocalite) {
      return res.status(404).json({
        success: false,
        message: 'Sous-localité introuvable'
      });
    }

    // Vérifier que le nom n'existe pas déjà dans cette sous-localité
    const existingSection = await Section.findOne({
      where: { 
        nom,
        sous_localite_id 
      }
    });

    if (existingSection) {
      return res.status(409).json({
        success: false,
        message: 'Une section avec ce nom existe déjà dans cette sous-localité'
      });
    }

    // Si ordre_affichage n'est pas fourni, calculer le prochain
    let finalOrdreAffichage = ordre_affichage;
    if (!finalOrdreAffichage) {
      const maxSection = await Section.findOne({
        where: { sous_localite_id },
        order: [['ordre_affichage', 'DESC']]
      });
      finalOrdreAffichage = maxSection ? maxSection.ordre_affichage + 1 : 1;
    }

    // Créer la section
    const section = await Section.create({
      nom,
      sous_localite_id,
      president_nom: president_nom || null,
      president_telephone: president_telephone || null,
      president_email: president_email || null,
      ordre_affichage: finalOrdreAffichage,
      is_active: true
    });

    // Recharger avec les relations
    const createdSection = await Section.findByPk(section.id, {
      include: [{
        model: SousLocalite,
        as: 'sousLocalite'
      }]
    });

    logger.info(`Nouvelle section créée: ${nom} par ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Section créée avec succès',
      data: { section: createdSection }
    });

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Cette section existe déjà'
      });
    }
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

    // Mise à jour seulement des champs fournis
    if (nom !== undefined) section.nom = nom;
    if (president_nom !== undefined) section.president_nom = president_nom;
    if (president_telephone !== undefined) section.president_telephone = president_telephone;
    if (president_email !== undefined) section.president_email = president_email;
    if (ordre_affichage !== undefined) section.ordre_affichage = ordre_affichage;
    if (is_active !== undefined) section.is_active = is_active;

    await section.save();

    // Recharger avec les relations
    const updatedSection = await Section.findByPk(section.id, {
      include: [{
        model: SousLocalite,
        as: 'sousLocalite'
      }]
    });

    logger.info(`Section ${section.nom} mise à jour par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Section mise à jour avec succès',
      data: { section: updatedSection }
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

    // Vérifier s'il y a des déplacements associés (optionnel)
    // Si vous avez une relation avec la table deplacements :
    /*
    const hasDeplacements = await section.countDeplacements();
    if (hasDeplacements > 0) {
      return res.status(409).json({
        success: false,
        message: 'Impossible de supprimer cette section car elle a des déplacements associés'
      });
    }
    */

    const sectionName = section.nom;
    await section.destroy();

    logger.info(`Section ${sectionName} supprimée par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Section supprimée avec succès'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Activer/Désactiver une section
// @route   PATCH /api/sections/:id/toggle
// @access  Private (Super Admin)
exports.toggleSectionActive = async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section introuvable'
      });
    }

    section.is_active = !section.is_active;
    await section.save();

    logger.info(`Section ${section.nom} ${section.is_active ? 'activée' : 'désactivée'} par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Section ${section.is_active ? 'activée' : 'désactivée'} avec succès`,
      data: { section }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les statistiques des sections
// @route   GET /api/sections/stats
// @access  Private
exports.getSectionsStats = async (req, res, next) => {
  try {
    const total = await Section.count();
    const active = await Section.count({ where: { is_active: true } });
    const inactive = await Section.count({ where: { is_active: false } });
    
    const withPresident = await Section.count({
      where: {
        president_nom: { [Op.ne]: null }
      }
    });

    // Stats par sous-localité
    const bySousLocalite = await Section.findAll({
      attributes: [
        'sous_localite_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      include: [{
        model: SousLocalite,
        as: 'sousLocalite',
        attributes: ['code', 'nom']
      }],
      group: ['sous_localite_id', 'sousLocalite.id']
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        withPresident,
        bySousLocalite
      }
    });

  } catch (error) {
    next(error);
  }
};
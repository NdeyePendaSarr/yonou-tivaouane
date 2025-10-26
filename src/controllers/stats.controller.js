const { 
  Deplacement, 
  Section, 
  EditionMawlid, 
  Car, 
  SousLocalite, 
  Incident 
} = require('../models');
const logger = require('../utils/logger');

// @desc    Statistiques globales du dashboard
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const activeEdition = await EditionMawlid.findOne({
      where: { is_active: true }
    });

    if (!activeEdition) {
      return res.status(200).json({
        success: true,
        data: {
          total_sections: 31,
          total_deplacements: 0,
          total_cars: 0,
          total_passagers: 0
        }
      });
    }

    const totalSections = await Section.count({ where: { is_active: true } });
    const totalDeplacements = await Deplacement.count({ where: { edition_id: activeEdition.id } });

    res.status(200).json({
      success: true,
      data: {
        total_sections: totalSections,
        total_deplacements: totalDeplacements,
        total_cars: 0,
        total_passagers: 0,
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
    const sousLocalites = await SousLocalite.findAll();
    
    res.status(200).json({
      success: true,
      count: sousLocalites.length,
      data: {
        sous_localites: sousLocalites
      }
    });
  } catch (error) {
    logger.error('Erreur getStatsSousLocalites:', error);
    next(error);
  }
};

// @desc    Statistiques d'une édition
// @route   GET /api/stats/edition/:editionId
// @access  Private
exports.getStatsEdition = async (req, res, next) => {
  try {
    const edition = await EditionMawlid.findByPk(req.params.editionId);
    
    if (!edition) {
      return res.status(404).json({
        success: false,
        message: 'Édition introuvable'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: edition.id,
        annee: edition.annee,
        statut: edition.statut
      }
    });
  } catch (error) {
    logger.error('Erreur getStatsEdition:', error);
    next(error);
  }
};
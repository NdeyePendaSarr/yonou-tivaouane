const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getRapportEdition,
  getRapportDeplacement,
  getHistorique,
  comparerEditions,
  getEvolutionParticipants
} = require('../controllers/rapport.controller');

// Toutes les routes nécessitent une authentification
router.use(protect);

// =====================================================
// 📊 RAPPORTS PAR ÉDITION
// =====================================================

// @route   GET /api/rapports/edition/:editionId
// @desc    Rapport complet d'une édition (aller/retour par section, stats globales, incidents)
// @access  Private (Super Admin)
router.get('/edition/:editionId', restrictTo('Super Admin'), getRapportEdition);

// @route   GET /api/rapports/deplacement/:deplacementId
// @desc    Rapport détaillé d'un déplacement spécifique
// @access  Private (Super Admin)
router.get('/deplacement/:deplacementId', restrictTo('Super Admin'), getRapportDeplacement);

// =====================================================
// 📜 HISTORIQUE MULTI-ANNÉES
// =====================================================

// @route   GET /api/rapports/historique
// @desc    Historique de toutes les éditions avec statistiques
// @access  Private (Super Admin)
router.get('/historique', restrictTo('Super Admin'), getHistorique);

// @route   GET /api/rapports/comparaison?edition1_id=X&edition2_id=Y
// @desc    Comparer deux éditions (évolution, pourcentages)
// @access  Private (Super Admin)
router.get('/comparaison', restrictTo('Super Admin'), comparerEditions);

// @route   GET /api/rapports/evolution-participants
// @desc    Évolution du nombre de participants sur plusieurs années
// @access  Private (Super Admin)
router.get('/evolution-participants', restrictTo('Super Admin'), getEvolutionParticipants);

module.exports = router;
// ==========================================
// FICHIER : backend/src/routes/sousLocalites.routes.js
// ==========================================

const express = require('express');
const router = express.Router();
const sousLocalitesController = require('../controllers/sousLocalites.controller');
const { authenticateToken } = require('../middlewares/auth.middleware'); // ✅ CORRIGÉ : middlewares (avec S)

/**
 * @route   GET /api/sous-localites
 * @desc    Récupérer toutes les sous-localités
 * @access  Private
 * @query   edition_id (optionnel) - Pour avoir les stats d'une édition
 * 
 * Exemples:
 * - GET /api/sous-localites
 * - GET /api/sous-localites?edition_id=1
 */
router.get('/', authenticateToken, sousLocalitesController.getAll);

/**
 * @route   GET /api/sous-localites/stats/:edition_id
 * @desc    Récupérer les stats détaillées par édition
 * @access  Private
 * 
 * Exemple:
 * - GET /api/sous-localites/stats/1
 */
router.get('/stats/:edition_id', authenticateToken, sousLocalitesController.getStatsByEdition);

/**
 * @route   GET /api/sous-localites/:id
 * @desc    Récupérer une sous-localité par ID avec ses sections
 * @access  Private
 * 
 * Exemple:
 * - GET /api/sous-localites/1
 */
router.get('/:id', authenticateToken, sousLocalitesController.getById);

/**
 * @route   POST /api/sous-localites
 * @desc    Créer une nouvelle sous-localité
 * @access  Private (Super Admin uniquement)
 * 
 * Body requis:
 * {
 *   "code": "F",
 *   "nom": "Sous-Localité F",
 *   "description": "Description optionnelle",
 *   "ordre_affichage": 6
 * }
 */
router.post('/', authenticateToken, sousLocalitesController.create);

/**
 * @route   PUT /api/sous-localites/:id
 * @desc    Mettre à jour une sous-localité
 * @access  Private (Super Admin uniquement)
 * 
 * Body (tous optionnels):
 * {
 *   "nom": "Nouveau nom",
 *   "description": "Nouvelle description",
 *   "ordre_affichage": 7
 * }
 */
router.put('/:id', authenticateToken, sousLocalitesController.update);

/**
 * @route   DELETE /api/sous-localites/:id
 * @desc    Supprimer une sous-localité
 * @access  Private (Super Admin uniquement)
 * 
 * Note: Ne peut pas supprimer si la sous-localité contient des sections
 */
router.delete('/:id', authenticateToken, sousLocalitesController.delete);

module.exports = router;
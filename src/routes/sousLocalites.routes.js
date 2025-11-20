// ==========================================
// FICHIER : backend/src/routes/sousLocalites.routes.js
// ==========================================

const express = require('express');
const router = express.Router();

// Essayez ces différentes variantes selon votre structure :
let sousLocalitesController;
let authenticateToken;

try {
  // Tentative 1 : chemin standard
  sousLocalitesController = require('../controllers/sousLocalites.controller');
  authenticateToken = require('../middlewares/auth').authenticateToken;
} catch (e1) {
  try {
    // Tentative 2 : sans le 's' à middlewares
    sousLocalitesController = require('../controllers/sousLocalites.controller');
    authenticateToken = require('../middleware/auth.middleware').authenticateToken;
  } catch (e2) {
    try {
      // Tentative 3 : chemins absolus depuis src
      sousLocalitesController = require('../../controllers/sousLocalites.controller');
      authenticateToken = require('../../middlewares/auth').authenticateToken;
    } catch (e3) {
      console.error('❌ Impossible de charger les dépendances pour sousLocalites.routes.js');
      console.error('Erreur 1:', e1.message);
      console.error('Erreur 2:', e2.message);
      console.error('Erreur 3:', e3.message);
      throw new Error('Vérifiez la structure de vos dossiers backend/src/');
    }
  }
}

/**
 * @route   GET /api/sous-localites
 * @desc    Récupérer toutes les sous-localités
 * @access  Private
 */
router.get('/', authenticateToken, sousLocalitesController.getAll);

/**
 * @route   GET /api/sous-localites/stats/:edition_id
 * @desc    Récupérer les stats détaillées par édition
 * @access  Private
 */
router.get('/stats/:edition_id', authenticateToken, sousLocalitesController.getStatsByEdition);

/**
 * @route   GET /api/sous-localites/:id
 * @desc    Récupérer une sous-localité par ID avec ses sections
 * @access  Private
 */
router.get('/:id', authenticateToken, sousLocalitesController.getById);

/**
 * @route   POST /api/sous-localites
 * @desc    Créer une nouvelle sous-localité (Super Admin)
 * @access  Private
 */
router.post('/', authenticateToken, sousLocalitesController.create);

/**
 * @route   PUT /api/sous-localites/:id
 * @desc    Mettre à jour une sous-localité (Super Admin)
 * @access  Private
 */
router.put('/:id', authenticateToken, sousLocalitesController.update);

/**
 * @route   DELETE /api/sous-localites/:id
 * @desc    Supprimer une sous-localité (Super Admin)
 * @access  Private
 */
router.delete('/:id', authenticateToken, sousLocalitesController.delete);

module.exports = router;
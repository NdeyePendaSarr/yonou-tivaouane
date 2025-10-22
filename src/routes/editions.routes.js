const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllEditions,
  getEditionById,
  getActiveEdition,
  createEdition,
  updateEdition,
  activateEdition,
  closeEdition,
  archiveEdition,
  deleteEdition
} = require('../controllers/editions.controller');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', getAllEditions);
router.get('/active', getActiveEdition);
router.get('/:id', getEditionById);

// Routes réservées aux Super Admin
router.post('/', restrictTo('Super Admin'), createEdition);
router.put('/:id', restrictTo('Super Admin'), updateEdition);
router.put('/:id/activate', restrictTo('Super Admin'), activateEdition);
router.put('/:id/close', restrictTo('Super Admin'), closeEdition);
router.put('/:id/archive', restrictTo('Super Admin'), archiveEdition);
router.delete('/:id', restrictTo('Super Admin'), deleteEdition);

module.exports = router;
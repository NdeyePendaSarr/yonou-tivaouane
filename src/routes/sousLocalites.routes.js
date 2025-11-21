// ==========================================
// FICHIER 2 : backend/src/routes/sousLocalites.routes.js
// ==========================================

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllSousLocalites,
  getSousLocaliteById,
  createSousLocalite,
  updateSousLocalite,
  deleteSousLocalite
} = require('../controllers/sousLocalites.controller');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', getAllSousLocalites);
router.get('/:id', getSousLocaliteById);

// Routes réservées aux Super Admin
router.post('/', restrictTo('Super Admin'), createSousLocalite);
router.put('/:id', restrictTo('Super Admin'), updateSousLocalite);
router.delete('/:id', restrictTo('Super Admin'), deleteSousLocalite);

module.exports = router;
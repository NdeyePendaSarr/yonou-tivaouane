const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllSections,
  getSectionsBySousLocalite,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sections.controller');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes accessibles à tous les utilisateurs authentifiés
router.get('/', getAllSections);
router.get('/by-sous-localite/:code', getSectionsBySousLocalite);
router.get('/:id', getSectionById);

// Routes réservées aux Super Admin
router.post('/', restrictTo('Super Admin'), createSection);
router.put('/:id', restrictTo('Super Admin'), updateSection);
router.delete('/:id', restrictTo('Super Admin'), deleteSection);

module.exports = router;
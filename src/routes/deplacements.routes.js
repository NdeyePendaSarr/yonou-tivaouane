const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllDeplacements,
  getDeplacementsActiveEdition,
  getDeplacementById,
  createDeplacement,
  updateDeplacement,
  deleteDeplacement,
  getDeplacementStats
} = require('../controllers/deplacements.controller');

router.use(protect);

// Routes accessibles à tous
router.get('/', getAllDeplacements);
router.get('/active-edition', getDeplacementsActiveEdition);
router.get('/:id', getDeplacementById);
router.get('/:id/stats', getDeplacementStats);

// Routes Super Admin
router.post('/', restrictTo('Super Admin'), createDeplacement);
router.put('/:id', restrictTo('Super Admin'), updateDeplacement);
router.delete('/:id', restrictTo('Super Admin'), deleteDeplacement);

module.exports = router;
// ====================================================================
// FICHIER 4 : backend/routes/stats.routes.js (NOUVEAU)
// ====================================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getDashboardStats,
  getStatsSousLocalites,
  getStatsEdition
} = require('../controllers/stats.controller');

router.use(protect);

// Routes accessibles à tous
router.get('/dashboard', getDashboardStats);
router.get('/sous-localites/:editionId', getStatsSousLocalites);
router.get('/edition/:editionId', getStatsEdition);

module.exports = router;

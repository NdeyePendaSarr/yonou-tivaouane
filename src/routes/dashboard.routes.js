const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getStatsGlobales,
  getStatsBySousLocalite,
  getCarsRealtime,
  getTimeline
} = require('../controllers/dashboard.controller');

router.use(protect);

router.get('/stats', getStatsGlobales);
router.get('/stats/by-sous-localite', getStatsBySousLocalite);
router.get('/cars-realtime', getCarsRealtime);
router.get('/timeline', getTimeline);

module.exports = router;
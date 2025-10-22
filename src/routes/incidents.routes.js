const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllIncidents,
  getIncidentsNonResolus,
  getIncidentById,
  signalerIncident,
  updateIncident,
  resoudreIncident,
  deleteIncident,
  getIncidentsStats
} = require('../controllers/incidents.controller');

router.use(protect);

// Routes accessibles à tous
router.get('/', getAllIncidents);
router.get('/non-resolus', getIncidentsNonResolus);
router.get('/stats', getIncidentsStats);
router.get('/:id', getIncidentById);
router.post('/', signalerIncident);
router.put('/:id', updateIncident);
router.put('/:id/resolve', resoudreIncident);

// Routes Super Admin
router.delete('/:id', restrictTo('Super Admin'), deleteIncident);

module.exports = router;
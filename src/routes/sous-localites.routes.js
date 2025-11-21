// routes/sous-localites.routes.js
const express = require('express');
const router = express.Router();
const sousLocalitesController = require('../controllers/sous-localites.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route   GET /api/sous-localites
 * @desc    Récupérer toutes les sous-localités (A, B, C, D, E)
 * @access  Private
 */
router.get('/', sousLocalitesController.getAllSousLocalites);

/**
 * @route   GET /api/sous-localites/:id
 * @desc    Récupérer une sous-localité par ID
 * @access  Private
 */
router.get('/:id', sousLocalitesController.getSousLocaliteById);

/**
 * @route   GET /api/sous-localites/:id/stats
 * @desc    Récupérer les statistiques d'une sous-localité
 * @access  Private
 */
router.get('/:id/stats', sousLocalitesController.getSousLocaliteStats);

/**
 * @route   GET /api/sous-localites/:id/sections
 * @desc    Récupérer les sections d'une sous-localité
 * @access  Private
 */
router.get('/:id/sections', sousLocalitesController.getSectionsBySousLocalite);

module.exports = router;
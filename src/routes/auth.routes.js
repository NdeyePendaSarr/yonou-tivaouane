const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,      // ← AJOUTÉ
  resetPassword        // ← AJOUTÉ
} = require('../controllers/auth.controller');

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes publiques pour mot de passe oublié
router.post('/forgot-password', forgotPassword);     // ← NOUVELLE ROUTE
router.post('/reset-password', resetPassword);       // ← NOUVELLE ROUTE

// Routes protégées
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
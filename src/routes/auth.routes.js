const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword
} = require('../controllers/auth.controller');

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
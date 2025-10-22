const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllCars,
  getCarsTempsReel,
  getCarById,
  createCar,
  updateCar,
  updateCarStatus,
  enregistrerDepart,
  enregistrerArrivee,
  deleteCar
} = require('../controllers/cars.controller');

router.use(protect);

// Routes accessibles à tous
router.get('/', getAllCars);
router.get('/temps-reel', getCarsTempsReel);
router.get('/:id', getCarById);

// Routes Super Admin
router.post('/', restrictTo('Super Admin'), createCar);
router.put('/:id', restrictTo('Super Admin'), updateCar);
router.put('/:id/status', restrictTo('Super Admin'), updateCarStatus);
router.put('/:id/depart', restrictTo('Super Admin'), enregistrerDepart);
router.put('/:id/arrivee', restrictTo('Super Admin'), enregistrerArrivee);
router.delete('/:id', restrictTo('Super Admin'), deleteCar);

module.exports = router;
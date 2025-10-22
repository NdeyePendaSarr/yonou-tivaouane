const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAllNotifications,
  getUnreadNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanOldNotifications,
  getUnreadCount
} = require('../controllers/notifications.controller');

router.use(protect);

// Routes accessibles à tous
router.get('/', getAllNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

// Routes Super Admin
router.post('/', restrictTo('Super Admin'), createNotification);
router.delete('/clean-old', restrictTo('Super Admin'), cleanOldNotifications);

module.exports = router;
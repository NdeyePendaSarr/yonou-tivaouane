const { Notification, User, Car, Deplacement, Incident, Section } = require('../models');
const logger = require('../utils/logger');

// @desc    Obtenir toutes les notifications
// @route   GET /api/notifications
// @access  Private
exports.getAllNotifications = async (req, res, next) => {
  try {
    const { type, is_read } = req.query;
    
    const whereClause = { destinataire_id: req.user.id };
    if (type) whereClause.type = type;
    if (is_read !== undefined) whereClause.is_read = is_read === 'true';

    const notifications = await Notification.findAll({
      where: whereClause,
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{
              model: Section,
              as: 'section',
              attributes: ['id', 'nom']
            }]
          }]
        },
        {
          model: Deplacement,
          as: 'deplacement',
          include: [{
            model: Section,
            as: 'section',
            attributes: ['id', 'nom']
          }]
        },
        {
          model: Incident,
          as: 'incident'
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50 // Limiter à 50 dernières notifications
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir les notifications non lues
// @route   GET /api/notifications/unread
// @access  Private
exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { 
        destinataire_id: req.user.id,
        is_read: false 
      },
      include: [
        {
          model: Car,
          as: 'car',
          include: [{
            model: Deplacement,
            as: 'deplacement',
            include: [{
              model: Section,
              as: 'section',
              attributes: ['id', 'nom']
            }]
          }]
        },
        {
          model: Deplacement,
          as: 'deplacement',
          include: [{
            model: Section,
            as: 'section',
            attributes: ['id', 'nom']
          }]
        },
        {
          model: Incident,
          as: 'incident'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: { notifications }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Créer une notification
// @route   POST /api/notifications
// @access  Private (Super Admin)
exports.createNotification = async (req, res, next) => {
  try {
    const {
      type,
      titre,
      message,
      car_id,
      deplacement_id,
      incident_id,
      destinataire_id
    } = req.body;

    // Si pas de destinataire spécifié, envoyer à tous les Super Admin
    let destinataires = [];
    
    if (destinataire_id) {
      destinataires = [destinataire_id];
    } else {
      const superAdmins = await User.findAll({
        where: { role: 'Super Admin', is_active: true },
        attributes: ['id']
      });
      destinataires = superAdmins.map(u => u.id);
    }

    // Créer une notification pour chaque destinataire
    const notifications = [];
    for (const destId of destinataires) {
      const notification = await Notification.create({
        type,
        titre,
        message,
        car_id,
        deplacement_id,
        incident_id,
        destinataire_id: destId,
        is_read: false
      });
      notifications.push(notification);
    }

    logger.info(`${notifications.length} notification(s) créée(s) - ${type}`);

    res.status(201).json({
      success: true,
      message: `${notifications.length} notification(s) créée(s) avec succès`,
      data: { notifications }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Marquer une notification comme lue
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { 
        id: req.params.id,
        destinataire_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    notification.is_read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marquée comme lue',
      data: { notification }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Marquer toutes les notifications comme lues
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const [updatedCount] = await Notification.update(
      { is_read: true },
      { 
        where: { 
          destinataire_id: req.user.id,
          is_read: false
        }
      }
    );

    logger.info(`${updatedCount} notifications marquées comme lues pour ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${updatedCount} notification(s) marquée(s) comme lue(s)`,
      data: { count: updatedCount }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: { 
        id: req.params.id,
        destinataire_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable'
      });
    }

    await notification.destroy();

    res.status(200).json({
      success: true,
      message: 'Notification supprimée avec succès'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer les notifications anciennes (plus de 30 jours)
// @route   DELETE /api/notifications/clean-old
// @access  Private (Super Admin)
exports.cleanOldNotifications = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30); // 30 jours

    const deletedCount = await Notification.destroy({
      where: {
        created_at: { [Op.lt]: dateLimit },
        is_read: true
      }
    });

    logger.info(`${deletedCount} anciennes notifications supprimées par ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${deletedCount} notification(s) supprimée(s)`,
      data: { count: deletedCount }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le nombre de notifications non lues
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { 
        destinataire_id: req.user.id,
        is_read: false 
      }
    });

    res.status(200).json({
      success: true,
      data: { count }
    });

  } catch (error) {
    next(error);
  }
};
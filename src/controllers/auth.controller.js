const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { nom, prenom, email, password, telephone, role } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      password_hash: password,
      telephone,
      role: role || 'Observateur'
    });

    // Générer le token
    const token = generateToken(user.id);

    logger.info(`Nouvel utilisateur créé: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password_hash'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est désactivé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token
    const token = generateToken(user.id);

    logger.info(`Connexion réussie: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          telephone: user.telephone,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Modifier le profil
// @route   PUT /api/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const { nom, prenom, telephone } = req.body;

    const user = await User.findByPk(req.user.id);

    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;

    await user.save();

    logger.info(`Profil mis à jour: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Ancien et nouveau mot de passe requis'
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { include: ['password_hash'] }
    });

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    user.password_hash = newPassword;
    await user.save();

    logger.info(`Mot de passe changé: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    next(error);
  }
};

// ======================================================================
// =================== MOT DE PASSE OUBLIÉ - 2 NOUVELLES FONCTIONS ======
// ======================================================================

// @desc    Demander un lien de réinitialisation de mot de passe
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email'
      });
    }

    const user = await User.findOne({ where: { email } });

    // Sécurité : même si l'email n'existe pas, on renvoie un message neutre
    if (!user) {
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
      });
    }

    // Génère un token sécurisé (valable 1 heure)
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    user.reset_password_token = resetToken;
    user.reset_password_expires = Date.now() + 3600000; // 1 heure
    await user.save();

    // URL de réinitialisation (adapte le port si besoin)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Pour tester SANS email : on log le lien dans la console
    logger.info(`LIEN DE RÉINITIALISATION pour ${email} : ${resetUrl}`.bgYellow.black);

    // Plus tard tu ajouteras nodemailer ici
    // await sendResetEmail(email, resetUrl);

    res.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
    });

  } catch (error) {
    logger.error('Erreur forgotPassword:', error);
    next(error);
  }
};

// @desc    Réinitialiser le mot de passe avec le token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: { [require('sequelize').Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Lien invalide ou expiré'
      });
    }

    // Mise à jour du mot de passe
    user.password_hash = password; // Ton hook beforeCreate/beforeUpdate hash automatiquement
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    logger.info(`Mot de passe réinitialisé avec succès pour: ${user.email}`);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    logger.error('Erreur resetPassword:', error);
    next(error);
  }
};

// ======================================================================
// ========================= FIN DES AJOUTS =============================
// ======================================================================
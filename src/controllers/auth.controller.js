const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');
const { Resend } = require('resend'); // ← AJOUTÉ

const resend = new Resend(process.env.RESEND_API_KEY); // ← AJOUTÉ

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

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    const user = await User.create({
      nom,
      prenom,
      email,
      password_hash: password,
      telephone,
      role: role || 'Observateur'
    });

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

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

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
// =================== MOT DE PASSE OUBLIÉ - VRAI EMAIL AVEC RESEND =====
// ======================================================================

// @desc    Demander un lien de réinitialisation de mot de passe
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log('🔍 [FORGOT-PASSWORD] Début de la requête pour:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir un email'
      });
    }

    const user = await User.findOne({ where: { email } });

    // Sécurité : même réponse si l'email n'existe pas
    if (!user) {
      console.log('⚠️ [FORGOT-PASSWORD] Utilisateur non trouvé:', email);
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
      });
    }

    console.log('✅ [FORGOT-PASSWORD] Utilisateur trouvé:', user.email);

    // Génère un token sécurisé (valable 1 heure)
    const resetToken = Math.random().toString(36).substring(2, 15) +
                      Math.random().toString(36).substring(2, 15) +
                      Math.random().toString(36).substring(2, 15);

    user.reset_password_token = resetToken;
    user.reset_password_expires = Date.now() + 3600000; // 1 heure
    await user.save();

    console.log('🔑 [FORGOT-PASSWORD] Token généré:', resetToken);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log('🔗 [FORGOT-PASSWORD] URL de réinitialisation:', resetUrl);

    // ENVOI DU VRAI EMAIL AVEC RESEND
    console.log('📧 [FORGOT-PASSWORD] Tentative d\'envoi d\'email via Resend...');
    console.log('   - From:', 'onboarding@resend.dev');
    console.log('   - To:', email);
    console.log('   - API Key présente:', !!process.env.RESEND_API_KEY);

    try {
      const emailResult = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: '🔐 Réinitialisation de votre mot de passe - Yonou Tivaouane',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #f9f9f9; border-radius: 12px;">
            <h2 style="color: #AC3700; text-align: center;">Yonou Tivaouane</h2>
            <p style="font-size: 16px;">Bonjour <strong>${user.prenom || 'utilisateur'}</strong>,</p>
            <p style="font-size: 16px;">Vous avez demandé une réinitialisation de votre mot de passe.</p>
            <p style="font-size: 16px;">Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe (lien valable 1 heure) :</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" style="background: #AC3700; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              Yonou Tivaouane - Gestion des déplacements Mbour ↔ Tivaouane<br>
              © 2025 NPS - Tous droits réservés
            </p>
          </div>
        `
      });

      console.log('✅ [FORGOT-PASSWORD] Email envoyé avec succès !');
      console.log('📬 [FORGOT-PASSWORD] Résultat Resend:', JSON.stringify(emailResult, null, 2));

      logger.info(`Email de réinitialisation envoyé à ${email}`);

      res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
      });

    } catch (emailError) {
      console.error('❌ [FORGOT-PASSWORD] ERREUR lors de l\'envoi de l\'email:');
      console.error('   - Message:', emailError.message);
      console.error('   - Stack:', emailError.stack);
      console.error('   - Détails complets:', JSON.stringify(emailError, null, 2));
      
      // On retourne quand même success pour ne pas révéler si l'email existe
      res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
      });
    }

  } catch (error) {
    console.error('❌ [FORGOT-PASSWORD] ERREUR GÉNÉRALE:', error);
    logger.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
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

    user.password_hash = password;
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
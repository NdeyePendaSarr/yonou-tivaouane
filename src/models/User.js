const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le nom est requis' }
    }
  },
  prenom: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le prénom est requis' }
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Email invalide' }
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  telephone: {
    type: DataTypes.STRING(20)
  },
  role: {
    type: DataTypes.ENUM('Super Admin', 'Admin', 'Observateur'),
    allowNull: false,
    defaultValue: 'Observateur'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = User;
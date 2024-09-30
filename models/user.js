const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const sequelize = require('../config/config.js');
const { v4: uuidv4 } = require('uuid'); 


const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID, // Use UUID type
        defaultValue: DataTypes.UUIDV4, // Automatically generates UUIDv4
        primaryKey: true, // Set as the primary key
    },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    //Here we are using isEmail validator provided by sequelize by default along with some others such
    //as isAlphanumeric, isNumeric, isUrl
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  account_created: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  account_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  tableName:'User',
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    },
    beforeUpdate: (user) => {
      user.account_updated = new Date();
    }
  },
  schema: 'public', 
});

module.exports = User;

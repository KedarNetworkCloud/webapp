const { DataTypes } = require('sequelize');
const sequelize = require('../config/config.js');

const AppUser = sequelize.define('AppUser', {  // Changed variable name from User to AppUser
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
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
    hooks: {
        beforeUpdate: (appUser) => {  // Updated parameter from user to appUser for clarity
            appUser.account_updated = new Date(); // Update timestamp on user update
        }
    },
    schema: 'public', 
});

module.exports = AppUser;  // Changed from User to AppUser

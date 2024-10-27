const { DataTypes } = require('sequelize');
const sequelize = require('../config/config.js');

const AppUser = sequelize.define('AppUser', {
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
    profile_image_file_name: {
        type: DataTypes.STRING,
        allowNull: true, // Can be null initially if the user hasn’t uploaded an image
    },
    profile_image_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    profile_image_upload_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    timestamps: false,
    hooks: {
        beforeUpdate: (appUser) => {
            appUser.account_updated = new Date(); // Update the timestamp whenever the record is updated
        }
    },
    schema: 'public', 
});

module.exports = AppUser;

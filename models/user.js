const { DataTypes } = require('sequelize');
const sequelize = require('../config/config.js');
const UserImage = require('./userImage'); // Import UserImage model

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
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default to false, meaning unverified
    },
    verificationToken: {
        type: DataTypes.STRING, // New field for storing verification token
        allowNull: true,        // It can be null until the token is generated
    },
    verificationEmailSentAt: {
        type: DataTypes.DATE,   // New field for datetime of when the verification email was sent
        allowNull: true,        // Allow null initially, as it may not be set until after the email is sent
    },
}, {
    tableName: "AppUsers",
    timestamps: false,
    hooks: {
        beforeUpdate: (appUser) => {
            appUser.account_updated = new Date(); // Update the timestamp whenever the record is updated
        }
    },
    schema: 'public', 
});

// Define the association for one-to-one relationship
AppUser.hasOne(UserImage, {
    foreignKey: 'userId', // The foreign key in UserImage that refers to AppUser
    as: 'image',          // Alias for the association
});

UserImage.belongsTo(AppUser, {
    foreignKey: 'userId', // The foreign key in UserImage that refers to AppUser
    as: 'user',           // Alias for the association
});

module.exports = AppUser;

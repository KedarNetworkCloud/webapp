const { DataTypes } = require('sequelize');
const sequelize = require('../config/config.js');

const UserImage = sequelize.define('UserImage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    profile_image_file_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    profile_image_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    profile_image_upload_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'AppUser', // name of the AppUser model
            key: 'id',
        },
    },
}, {
    tableName: 'UserImages',
    timestamps: false,
    schema: 'public', 
});

module.exports = UserImage;

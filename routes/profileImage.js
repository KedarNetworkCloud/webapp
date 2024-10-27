const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const AppUser = require('../models/user.js'); // Your AppUser model
const { checkDBMiddleware, authMiddleware } = require('./routes.js'); // Import middleware

const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
    region: process.env.AWS_REGION, // Set this in your .env file
});

// Multer S3 Storage Configuration
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME, // Your S3 bucket name from .env
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            cb(null, `${req.user.id}/${file.originalname}`); // Use user ID and original file name
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/; // Allowed extensions
        const isValid = allowedTypes.test(file.mimetype); // Check mime type
        if (isValid) {
            cb(null, true); // Accept file
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed!'), false); // Reject file
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
});

// POST /v1/user/self/pic
router.post('/user/self/pic', checkDBMiddleware, authMiddleware, upload.single('profileImage'), async (req, res) => {
    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
        }

        // Create uploaded image object
        const uploadedImage = {
            file_name: file.originalname, // Store the original file name
            id: req.user.id,
            url: file.location, // S3 URL of the uploaded file
            upload_date: new Date().toISOString(), // Current date in ISO format
            user_id: req.user.id,
        };

        // Update the user's profile image details in the database
        await AppUser.update({
            profile_image_file_name: uploadedImage.file_name,
            profile_image_url: uploadedImage.url,
            profile_image_upload_date: uploadedImage.upload_date,
        }, { where: { id: req.user.id } });

        // Return the uploaded image details in the response
        return res.status(201).json(uploadedImage);
    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;

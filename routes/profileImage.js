const express = require('express');
const AWS = require('aws-sdk');
const { AppUser } = require('../models/user'); // Adjust the import based on your structure
const { checkDBMiddleware, authMiddleware } = require('./routes.js'); // Import middleware
const multer = require('multer'); // Assuming you're using multer for file uploads
const upload = multer({ /* Multer configuration */ });

const router = express.Router();
const s3 = new AWS.S3(); // Ensure AWS SDK is configured correctly

// POST /user/self/pic
router.post('/user/self/pic', checkDBMiddleware, authMiddleware, upload.single('profileImage'), async (req, res) => {
    console.log("Uploading image");
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

// GET /user/self/pic
router.get('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    try {
        // Retrieve the user's profile image details
        const user = await AppUser.findOne({
            where: { id: req.user.id },
            attributes: ['profile_image_file_name', 'profile_image_url', 'profile_image_upload_date']
        });

        if (!user || !user.profile_image_url) {
            return res.status(404).json({ message: 'Profile image not found.' });
        }

        return res.status(200).json({
            file_name: user.profile_image_file_name,
            url: user.profile_image_url,
            upload_date: user.profile_image_upload_date
        });
    } catch (error) {
        console.error('Error retrieving image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /user/self/pic
router.delete('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    try {
        // Retrieve the user's current profile image details
        const user = await AppUser.findOne({ where: { id: req.user.id } });

        if (!user || !user.profile_image_url) {
            return res.status(404).json({ message: 'No profile image to delete.' });
        }

        // Delete the image from S3
        const params = {
            Bucket: process.env.S3_BUCKET_NAME, // Ensure your bucket name is set in your environment variables
            Key: user.profile_image_url.split('/').pop() // Extract the file name from the URL
        };

        await s3.deleteObject(params).promise();

        // Delete the image record from the database
        await AppUser.update({
            profile_image_file_name: null,
            profile_image_url: null,
            profile_image_upload_date: null,
        }, { where: { id: req.user.id } });

        return res.status(204).send(); // No Content
    } catch (error) {
        console.error('Error deleting image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;

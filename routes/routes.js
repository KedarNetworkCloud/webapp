const express = require('express');
const bcrypt = require('bcrypt');
const AppUser = require('../models/user.js');  // Changed User to AppUser
const sequelize = require('../config/config.js');
const { Op } = require('sequelize');
const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer'); // Assuming you're using multer for file uploads

const upload = multer({ /* Multer configuration */ });
const router = express.Router();
const s3 = new AWS.S3(); // Create an S3 instance

// Check DB connection function
async function checkDBConnection() {
    try {
        await sequelize.authenticate();
        return true;
    } catch (error) {
        return false; 
    }
}

// Middleware to check DB connection
const checkDBMiddleware = async (req, res, next) => {
    const dbConnectionStatus = await checkDBConnection();
    if (!dbConnectionStatus) {
        return res.status(503).json();
    }
    next();
};

// User route definitions
router.head('/user', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.head('/user/self', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json();
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    try {
        const user = await AppUser.findOne({  // Changed User to AppUser
            where: { email: { [Op.iLike]: email } }
        });

        if (!user) {
            return res.status(401).json();
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json();
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).json();
    }
};

// Create user
router.post('/user', checkDBMiddleware, async (req, res) => {
    const { first_name, last_name, password, email } = req.body;
    res.set('Cache-Control', 'no-cache');

    const allowedFields = ['first_name', 'last_name', 'password', 'email', 'account_created', 'account_updated'];
    
    const requestFields = Object.keys(req.body);
    const invalidFields = requestFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
        return res.status(400).json();
    }

    if (!first_name || !last_name || !password || !email) {
        return res.status(400).json();
    }

    const alphanumericRegex = /^[a-z0-9]+$/i;
    if (!alphanumericRegex.test(first_name) || !alphanumericRegex.test(last_name)) {
        return res.status(400).json();
    }

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        const emailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-]+)*@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json();
        }

        const existingUser = await AppUser.findOne({ where: { email } });  // Changed User to AppUser
        if (existingUser) {
            return res.status(400).json();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await AppUser.create({  // Changed User to AppUser
            email,
            password: hashedPassword,
            firstName: first_name,
            lastName: last_name,
        });

        return res.status(201).json({
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            account_created: newUser.account_created,
            account_updated: newUser.account_updated,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json();
    }
});

// Update user
router.put('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    const { first_name, last_name, password } = req.body;
    res.set('Cache-Control', 'no-cache');

    const fieldsAllowedToBeUpdated = ['first_name', 'last_name', 'password'];
    for (let key in req.body) {
        if (!fieldsAllowedToBeUpdated.includes(key)) {
            return res.status(400).json();
        }
    }

    const alphanumericRegex = /^[a-z0-9]+$/i;
    if (!alphanumericRegex.test(last_name) || !alphanumericRegex.test(first_name)) {
        return res.status(400).json();
    }

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }
        const user = req.user;

        if (first_name) user.firstName = first_name;
        if (last_name) user.lastName = last_name;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        return res.status(204).send(); 

    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json();
    }
});

// Get user details
router.get('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        res.set('Cache-Control', 'no-cache');
        return res.status(200).json({
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            account_created: req.user.account_created,
            account_updated: req.user.account_updated,
        });
    } catch (error) {
        console.error('Error retrieving user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /user/self/pic
router.post('/user/self/pic', checkDBMiddleware, authMiddleware, upload.single('profileImage'), async (req, res) => {
    console.log("Uploading image");
    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
        }

        // Set S3 upload parameters
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: file.originalname, // Use original file name
            Body: file.buffer, // Use file buffer for upload
            ContentType: file.mimetype, // Set the content type
        };

        // Upload to S3
        const uploadResult = await s3.upload(s3Params).promise();

        // Create uploaded image object
        const uploadedImage = {
            file_name: file.originalname,
            id: req.user.id,
            url: uploadResult.Location,
            upload_date: new Date().toISOString(),
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

// Additional route definitions for user
router.all('/user', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.all('/user/self', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.use((req, res) => {
    return res.status(404).json();
});

module.exports = { router, checkDBConnection,checkDBMiddleware, authMiddleware };

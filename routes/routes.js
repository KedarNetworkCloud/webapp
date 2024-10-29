const express = require('express');
const bcrypt = require('bcrypt');
const AppUser = require('../models/user.js');  // Changed User to AppUser
const UserImage = require('../models/userImage.js');
const sequelize = require('../config/config.js');
const { Op } = require('sequelize');
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

router.head('/user/self/pic', checkDBMiddleware, async (req, res) => {
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
        let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }
    
        if (contentLength === 0) {
            res.set('Cache-Control', 'no-cache');
            return res.status(200).json({
                id: req.user.id,
                email: req.user.email,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                account_created: req.user.account_created,
                account_updated: req.user.account_updated,
            });
        } else if (contentLength > 0) {
            return res.status(400).send('');
        }

    } catch (error) {
        console.error('Error retrieving user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /user/self/pic
router.post('/user/self/pic', checkDBMiddleware, authMiddleware, upload.single('profilePic'), async (req, res) => {
    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (Object.keys(req.query).length > 0) {
        return res.status(400).json();
    }

    if (contentLength > 0) {
        return res.status(400).send('');
    }

    try {
        const { file } = req;

        // Check if a file was uploaded
        if (!file) {
            return res.status(400).json();
        }

        // Validate file type
        const allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedFileTypes.includes(file.mimetype)) {
            return res.status(400).json();
        }

        // Check if the user exists
        const existingUser = await AppUser.findOne({ where: { id: req.user.id } });
        if (!existingUser) {
            return res.status(401).json();
        }

        // Check if the user already has a profile image
        const existingImage = await UserImage.findOne({ where: { userId: req.user.id } });
        if (existingImage) {
            return res.status(400).json();
        }

        // Set S3 upload parameters
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${req.user.id}/${file.originalname}`, // Key is now userId/fileName
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        // Upload to S3
        const uploadResult = await s3.upload(s3Params).promise();

        // Create a new entry in the UserImage table
        const newImage = await UserImage.create({
            profile_image_file_name: file.originalname,
            // Store the URL in the desired format
            profile_image_url: `${process.env.S3_BUCKET_NAME}/${req.user.id}/${file.originalname}`, // Custom URL format
            profile_image_upload_date: new Date().toISOString(),
            userId: req.user.id, // Associate this image with the user
        });

        await AppUser.update(
            { account_updated: new Date() },
            { where: { id: req.user.id } }
        );

        // Return the uploaded image details in the response
        return res.status(201).json({
            profile_image_file_name: newImage.profile_image_file_name,
            id: newImage.id,
            profile_image_url: newImage.profile_image_url,
            profile_image_upload_date: newImage.profile_image_upload_date,
            user_id: newImage.userId,
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json();
    }
});


// GET /user/self/pic
router.get('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (Object.keys(req.query).length > 0) {
        return res.status(400).json();
    }

    if (contentLength > 0) {
        return res.status(400).send('');
    }
    try {
        // Retrieve the user's profile image details from UserImage table
        const userImage = await UserImage.findOne({
            where: { userId: req.user.id },
            attributes: ['profile_image_file_name', 'profile_image_url', 'profile_image_upload_date', 'id', 'userId'] // Ensure these match your model
        });

        // Check if the user image exists
        if (!userImage) {
            return res.status(404).json();
        }

        // Prepare the response object
        return res.status(200).json({
            profile_image_file_name: userImage.profile_image_file_name, // Correct attribute name
            id: userImage.id, // Image ID
            profile_image_url: userImage.profile_image_url, // Correct attribute name
            profile_image_upload_date: userImage.profile_image_upload_date, // Correct attribute name
            user_id: userImage.userId // User ID
        });

    } catch (error) {
        console.error('Error retrieving image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /user/self/pic
router.delete('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (Object.keys(req.query).length > 0) {
        return res.status(400).json();
    }

    if (contentLength > 0) {
        return res.status(400).send('');
    }
    try {
        // Check if the user exists
        const user = await AppUser.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json();
        }

        // Retrieve the user's current profile image details
        const userImage = await UserImage.findOne({ where: { userId: req.user.id } });
        if (!userImage) {
            return res.status(404).json();
        }

        // Construct the key for deletion
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${req.user.id}/${userImage.profile_image_file_name}`, // Use user ID and file name
        };

        // Delete the image from S3
        await s3.deleteObject(params).promise();

        // Delete the image record from the UserImage table
        await UserImage.destroy({ where: { userId: req.user.id } });
        await AppUser.update(
            { account_updated: new Date() },
            { where: { id: req.user.id } }
        );

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

router.all('/user/self/pic', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.use((req, res) => {
    return res.status(404).json();
});

module.exports = { router, checkDBConnection,checkDBMiddleware, authMiddleware };

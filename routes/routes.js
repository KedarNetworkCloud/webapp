// routes/routes.js
const express = require('express');
const bcrypt = require('bcrypt'); // For hashing passwords
const User = require('../models/user.js'); // Adjust the path to your User model
const sequelize = require('../config/config.js'); // Ensure this is the correct path
const { ValidationError } = require('sequelize');
const { Op } = require('sequelize');


const router = express.Router();
let dbConnectionStatus = false; // Global variable to track DB connection status

// Check DB connection function
async function checkDBConnection() {
    try {
        await sequelize.authenticate();
        dbConnectionStatus = true; // Connection successful
    } catch (error) {
        dbConnectionStatus = false; // Connection failed
    }
}

// Middleware to check DB connection status
const checkDBMiddleware = async (req, res, next) => {
    await checkDBConnection(); // Check DB connection before proceeding
    if (!dbConnectionStatus) {
        return res.status(503).json({ message: 'Service Unavailable: Database connection failed.' });
    }
    next(); // Proceed to the next middleware or route handler
};

router.head('/user', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.head('/user/self', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

// Authentication middleware (with case-insensitive email query)
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json();
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    try {
        // Case-insensitive email search using `Op.iLike` in PostgreSQL
        const user = await User.findOne({
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


router.post('/user', checkDBMiddleware, async (req, res) => {
    // Destructure the request body
    const { first_name, last_name, password, email } = req.body;
    res.set('Cache-Control', 'no-cache');
    // Input validation: Check if all required fields are present
    if (!first_name || !last_name || !password || !email) {
        return res.status(400).json();
    }

    const firstName = first_name;
    const lastName = last_name;

    try {
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json();
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json();
        }

        hashedPassword = await bcrypt.hash(password, 10);
        // Create new user
        const newUser = await User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
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

        // General error response
        return res.status(500).json({ message: 'Internal server error.' });
    }
});



// Update User Route
router.put('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    const { first_name, last_name, password } = req.body;
    res.set('Cache-Control', 'no-cache');
    // Check for any invalid fields in the request body
    const fieldsAllowedToBeUpdated = ['first_name', 'last_name', 'password'];
    for (let key in req.body) {
        if (!fieldsAllowedToBeUpdated.includes(key)) {
            return res.status(400).json();
        }
    }

    try {
        const user = req.user;

        // Update fields if provided
        if (first_name) user.firstName = first_name;
        if (last_name) user.lastName = last_name;

        // Hash the password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save(); // Save changes

        return res.status(204).send(); // No Content status

    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json();
    }
});



// Get User Information Route with Basic Authentication
router.get('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    try {
        // Use the authenticated user's information from req.user
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


router.use((req, res) => {
    return res.status(404).json();
  });


router.all('/user', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send(); // Method not allowed
});

router.all('/user/self', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send(); // Method not allowed
});


// Export the router
module.exports = router;

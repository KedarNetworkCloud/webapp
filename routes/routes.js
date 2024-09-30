// routes/routes.js
const express = require('express');
const bcrypt = require('bcrypt'); // For hashing passwords
const User = require('../models/user.js'); // Adjust the path to your User model
const sequelize = require('../config/config.js'); // Ensure this is the correct path

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

// Authentication middleware (same as before)
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Check if Authorization header is present and starts with "Basic"
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json();
    }

    // Extract base64-encoded string after "Basic "
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    try {
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json();
        }

        // Compare the provided password with the stored hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json();
        }

        // Attach user to the request object for use in the route handler
        req.user = user;
        next(); // Move to the next middleware or route handler
    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Create User Route
router.post('/user', checkDBMiddleware, async (req, res) => {
    const { first_name, last_name, password, email } = req.body;
    const firstName = first_name;
    const lastName = last_name;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json();
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await User.create({
            email,
            password: hashedPassword, // Use hashed password
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
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Update User Route
router.put('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    const { firstName, lastName, password } = req.body; // Assuming you still send these in the body
    try {
        // Update user fields if provided
        const user = req.user; // Use authenticated user from authMiddleware

        // Update fields
        if (firstName) {
            user.firstName = firstName;
        }
        if (lastName) {
            user.lastName = lastName;
        }
        if (password) {
            user.password = await bcrypt.hash(password, 10); // Hash new password if provided
        }

        await user.save(); // Save changes

        return res.status(200).json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            account_created: user.account_created,
            account_updated: user.account_updated,
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Get User Information Route with Basic Authentication
router.get('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    try {
        // Use the authenticated user's information from req.user
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

// Export the router
module.exports = router;

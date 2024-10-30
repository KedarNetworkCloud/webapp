const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const sequelize = require('./config/config.js');
const application = express();
const { router: newUserRoutes, checkDBConnection } = require('./routes/routes.js');
const logger = require('./logger'); // Import logger
application.use(express.json());
const AppUsers = require('./models/user.js');
const UserImages = require('./models/userImage.js');

// Middleware to check DB connection
const checkDBMiddleware = async (req, res, next) => {
    try {
        await sequelize.authenticate();
        next();
    } catch (error) {
        logger.error('Database server error.'); // Log bad request response
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
};

// Health check routes
application.head('/healthz', checkDBMiddleware, async (req, res) => {
    logger.error('Method not allowed.'); // Log bad request response
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

application.get('/healthz', checkDBMiddleware, async (req, res) => {
    // Log incoming health check request
    logger.info('Received health check request.');

    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    // Check for query parameters in the request
    if (Object.keys(req.query).length > 0) {
        logger.warn('Health check request contains query parameters.'); // Log query parameters presence
        return res.status(400).json();
    }

    // Check for the content length to determine response status
    if (contentLength === 0) {
        logger.info('Health check response: 200 OK.'); // Log successful response
        return res.status(200).set('Cache-Control', 'no-cache').send();
    } else if (contentLength > 0) {
        logger.error('Health check response: 400 Bad Request.'); // Log bad request response
        return res.status(400).send('');
    }
});


application.all('/healthz', checkDBMiddleware, async (req, res) => {
    logger.error('Invalid route.'); // Log bad request response
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

// Use routes
application.use('/v1', checkDBMiddleware, newUserRoutes);

// Sync database and start server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        await AppUsers.sync(); // Sync dependency table first
        await UserImages.sync(); // Then sync the dependent table
        logger.info('Database synced successfully.');

        const port = process.env.APP_PORT || 8080;
        application.listen(port, () => {
            logger.info(`App listening on port ${port}`);
        });
    } catch (err) {
        logger.error('Error creating database tables:', err);
    }
};

startServer();

module.exports = application;

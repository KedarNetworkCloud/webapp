const dotenv = require('dotenv');
dotenv.config();

const StatsD = require('node-statsd');
const express = require('express');
const sequelize = require('./config/config.js');
const application = express();
const { router: newUserRoutes, checkDBConnection } = require('./routes/routes.js');
const logger = require('./logger');
application.use(express.json());
const AppUsers = require('./models/user.js');
const UserImages = require('./models/userImage.js');
const statsDConfig = require('./config/statsDconfig.json');

// Configure StatsD client
const statsdClient = new StatsD({
    host: 'localhost',
    port: statsDConfig.port,
});

// Middleware to check DB connection
const checkDBMiddleware = async (req, res, next) => {
    try {
        await sequelize.authenticate();
        next();
    } catch (error) {
        logger.error('Database server error.');
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
};

// Middleware for logging metrics
const logMetricsMiddleware = async (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path === '/healthz') {
            statsdClient.increment('healthz.request_count');
            statsdClient.timing('healthz.response_time', duration);
            logger.info(`Logged metrics: duration of /healthz request: ${duration}ms`);
        }
    });
    next();
};

// Health check routes with metrics middleware
application.get('/healthz', checkDBMiddleware, logMetricsMiddleware, async (req, res) => {
    logger.info('Received health check request.');

    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (Object.keys(req.query).length > 0) {
        logger.warn('Health check request contains query parameters.');
        return res.status(400).json();
    }

    if (contentLength === 0) {
        logger.info('Health check response: 200 OK.');
        return res.status(200).set('Cache-Control', 'no-cache').send();
    } else if (contentLength > 0) {
        logger.error('Health check response: 400 Bad Request.');
        return res.status(400).send('');
    }
});

application.all('/healthz', checkDBMiddleware, logMetricsMiddleware, async (req, res) => {
    logger.error('Invalid route.');
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

// Use routes
application.use('/v10', checkDBMiddleware, newUserRoutes);

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info("Database connection successful");

        // Sync AppUsers table first
        await AppUsers.sync({ alter: true });
        logger.info('AppUsers table synchronized successfully.');

        // Then sync UserImages table
        await UserImages.sync({ alter: true });
        logger.info('UserImages table synchronized successfully.');

        const port = process.env.APP_PORT || 8080;
        application.listen(port, () => {
            logger.info(`App listening on port ${port}`);
        });
    } catch (err) {
        logger.error('Error during database synchronization:', err);
    }
};

startServer();

module.exports = application;

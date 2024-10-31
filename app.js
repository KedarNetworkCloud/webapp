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
    host: 'localhost', // StatsD host (typically localhost if running CloudWatch Agent on the same EC2 instance)
    port: statsDConfig.port         // Default StatsD port
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

const logMetricsMiddleware = async (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Only track metrics if this is a /healthz request
        if (req.path === '/healthz') {
            // Metric 1: Increment the request count for /healthz endpoint in StatsD
            statsdClient.increment('healthz.request_count');

            // Metric 2: Record the duration of /healthz requests
            statsdClient.timing('healthz.response_time', duration);

            // Log the metrics directly
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
application.use('/v1', checkDBMiddleware, newUserRoutes);

// Sync database and start server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        await AppUsers.sync();
        await UserImages.sync();
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

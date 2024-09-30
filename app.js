// Load environment variables
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const sequelize = require('./config/config.js');
const application = express();
const newUserRoutes = require('./routes/routes.js');
application.use(express.json());

// Middleware to check DB connection status
const checkDBMiddleware = async (req, res, next) => {
    try {
        await sequelize.authenticate();
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(503).set('Cache-Control', 'no-cache').send(); // Service Unavailable
    }
};

// Health check routes
application.head('/healthz', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

application.get('/healthz', checkDBMiddleware, async (req, res) => {
    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (contentLength === 0) {
        return res.status(200).set('Cache-Control', 'no-cache').send();
    } else if (contentLength > 0) {
        return res.status(400).send(''); // Bad request for non-empty content
    }
});

application.all('/healthz', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send(); // Method not allowed
});

// Apply DB check middleware for all routes in '/v1'
application.use('/v1', checkDBMiddleware, newUserRoutes);

// Sync the models with the database and start the server
sequelize.sync()
    .then(() => {
        console.log('Database & tables created!');
        application.listen(process.env.APP_PORT, () => {
            console.log('Cloud Assignment - 1 Demo express server is running');
        });
    })
    .catch(err => {
        console.error('Error creating database tables:', err);
    });

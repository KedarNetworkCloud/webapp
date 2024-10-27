const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const sequelize = require('./config/config.js');
const application = express();
const { router: newUserRoutes, checkDBConnection } = require('./routes/routes.js'); 
const { router: profileImageRoutes } = require('./routes/profileImage.js'); // Ensure you import profileImageRoutes
application.use(express.json());

// Middleware to check DB connection
const checkDBMiddleware = async (req, res, next) => {
    try {
        await sequelize.authenticate();
        next();
    } catch (error) {
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
};

// Health check routes
application.head('/healthz', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

application.get('/healthz', checkDBMiddleware, async (req, res) => {
    let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

    if (Object.keys(req.query).length > 0) {
        return res.status(400).json();
    }

    if (contentLength === 0) {
        return res.status(200).set('Cache-Control', 'no-cache').send();
    } else if (contentLength > 0) {
        return res.status(400).send('');
    }
});

application.all('/healthz', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

// Use routes
application.use('/v1', checkDBMiddleware, newUserRoutes);
application.use('/v1', checkDBMiddleware, profileImageRoutes); // Use checkDBMiddleware with profileImageRoutes

// Sync database and start server
sequelize.sync()
    .then(() => {
        console.log('Database synced successfully.');
        const port = process.env.APP_PORT || 8080;  // Fallback to 8080 if APP_PORT is not set
        application.listen(port, () => {
            console.log(`App listening on port ${port}`);
        });
    })
    .catch(err => {
        console.error('Error creating database tables:', err);
    });

module.exports = application;

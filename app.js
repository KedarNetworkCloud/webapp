const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const sequelize = require('./config/config.js');
const application = express();
const { router: newUserRoutes, checkDBConnection } = require('./routes/routes.js'); 
application.use(express.json());

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

    if (contentLength === 0) {
        return res.status(200).set('Cache-Control', 'no-cache').send();
    } else if (contentLength > 0) {
        return res.status(400).send('');
    }
});

application.all('/healthz', checkDBMiddleware, async (req, res) => {
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

application.use('/v1', checkDBMiddleware, newUserRoutes);

sequelize.sync()
    .then(() => {
        console.log();
        application.listen(process.env.APP_PORT, () => {
            console.log();
        });
    })
    .catch(err => {
        console.error('Error creating database tables:', err);
    });

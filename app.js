///Our DB Credentials are stored in .env file. Following is required for using those credentials here
const dotenv = require('dotenv');
dotenv.config();

const express = require('express')
const { Sequelize } = require('sequelize');
const application = express();

///application.use(express.json())

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging:false, //by default sequelise logs everything to terminal to remove those by default logs use this command
  });

async function checkDBConnection() {
    try {

        await sequelize.authenticate();
        return 1;
    } catch (error) {
        throw new Error('Database connection failed');
    }
}


application.use(async (req, res, next) => {
    try {
        const dbConnectionStatus = await checkDBConnection();
        if (dbConnectionStatus === 1) {
            if (req.headers['content-length'] > 0) {
                return res.status(400).send('');
            }
            next();
        }
    } catch (error) {
        return res.status(503).send();
    }
});


application.head('/healthz', async (req, res) => {
    try {
        const dbConnectionStatus = await checkDBConnection();
        if (dbConnectionStatus === 1) {
            return res.status(405).set('Cache-Control', 'no-cache').send();
        }
    } catch (error) {
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
});


application.get('/healthz', async (req, res) => {
    try {
        const dbConnectionStatus = await checkDBConnection();
        if (dbConnectionStatus === 1) {
            return res.status(200).set('Cache-Control', 'no-cache').send();
        }
    } catch (error) {
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
});

application.all('/healthz', async (req, res) => {
    try {
        const dbConnectionStatus = await checkDBConnection();
        if (dbConnectionStatus === 1) {
            return res.status(405).set('Cache-Control', 'no-cache').send();
        }
    } catch (error) {
        return res.status(503).set('Cache-Control', 'no-cache').send();
    }
});


application.listen(process.env.APP_PORT, () => {
    console.log('Cloud Assignment - 1 Demo express server is running');
});
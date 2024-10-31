const winston = require('winston');
const path = require('path');

// Create a logger that writes to a file
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({
            filename: path.join('/opt/myapp/logs/app.log'), // Specify the file path
            level: 'info', // Log level
        }),
        new winston.transports.Console() // Optional: log to console as well
    ]
});

// Export the logger instance
module.exports = logger;
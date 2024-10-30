const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const AWS = require('aws-sdk');

// Configure AWS SDK with region
AWS.config.update({ region: 'us-east-1' }); // Set your region

// Create a CloudWatchLogs instance
const cloudWatchLogs = new AWS.CloudWatchLogs();

// Create a logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new WinstonCloudWatch({
            logGroupName: 'myAppLogs', // Set your log group name
            logStreamName: 'myAppLogs-Demo', // Set your log stream name
            awsRegion: 'us-east-1', // Set your region
            cloudWatchLogs: cloudWatchLogs,
        })
    ]
});

// Example usage of logger
logger.info('This is an info log');
logger.error('This is an error log');

// Export the logger instance
module.exports = logger;



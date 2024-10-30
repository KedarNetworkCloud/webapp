const { createLogger, transports, format } = require('winston');
const { CloudWatchLogs } = require('aws-sdk');

const cloudWatchLogs = new CloudWatchLogs({ region: 'us-east-1' });

const logGroupName = 'myapp-logs'; // Your log group name
const logStreamName = `myapp-stream-demo'}`; // Dynamic stream name based on environment

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(), // Log to console
    new transports.Stream({
      stream: {
        write: (message) => {
          const params = {
            logGroupName,
            logStreamName,
            logEvents: [
              {
                message,
                timestamp: Date.now()
              }
            ]
          };

          cloudWatchLogs.putLogEvents(params, (err) => {
            if (err) {
              console.error('Error sending log to CloudWatch:', err);
            }
          });
        }
      }
    })
  ]
});

// Example log
logger.info('This is an info log message');
logger.error('This is an error log message');


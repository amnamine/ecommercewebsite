const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'electromart' },
    transports: [
        new winston.transports.File({ 
            filename: config.logging.file,
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        }),
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error',
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        })
    ]
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Create a stream object for Morgan
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger; 
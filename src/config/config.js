require('dotenv').config();

const config = {
    // Server Configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Security
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION || '1h',
    saltRounds: parseInt(process.env.SALT_ROUNDS) || 10,
    
    // Database
    database: {
        path: process.env.DB_PATH || 'database.sqlite',
        logging: process.env.DB_LOGGING === 'true'
    },
    
    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },
    
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: process.env.LOG_MAX_FILES || '5'
    },
    
    // Admin
    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@electromart.com',
        password: process.env.ADMIN_PASSWORD
    },
    
    // Session
    session: {
        secret: process.env.SESSION_SECRET,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    },
    
    // Security Headers
    security: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com', 'cdnjs.cloudflare.com'],
                styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
                fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
                imgSrc: ["'self'", 'data:', 'placehold.co'],
                connectSrc: ["'self'"]
            }
        }
    }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config; 
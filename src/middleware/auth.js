const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const database = require('../utils/database');

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No token provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Token verification failed:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token.' 
        });
    }
};

// Check if user is active
const checkUserActive = async (req, res, next) => {
    try {
        const user = await database.getOne(
            'SELECT isActive FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or has been suspended.'
            });
        }

        next();
    } catch (error) {
        logger.error('Error checking user status:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

// Role-based access control
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.accountType)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

// Rate limiting for login attempts
const checkLoginAttempts = async (req, res, next) => {
    try {
        const user = await database.getOne(
            'SELECT failedLoginAttempts, lastLogin FROM users WHERE email = ?',
            [req.body.email]
        );

        if (user && user.failedLoginAttempts >= 5) {
            const lastLogin = new Date(user.lastLogin);
            const now = new Date();
            const hoursSinceLastAttempt = (now - lastLogin) / (1000 * 60 * 60);

            if (hoursSinceLastAttempt < 24) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Please try again after 24 hours.'
                });
            }

            // Reset failed attempts after 24 hours
            await database.run(
                'UPDATE users SET failedLoginAttempts = 0 WHERE email = ?',
                [req.body.email]
            );
        }

        next();
    } catch (error) {
        logger.error('Error checking login attempts:', error.message);
        next();
    }
};

// Update failed login attempts
const updateLoginAttempts = async (email, success) => {
    try {
        if (success) {
            await database.run(
                'UPDATE users SET failedLoginAttempts = 0, lastLogin = CURRENT_TIMESTAMP WHERE email = ?',
                [email]
            );
        } else {
            await database.run(
                'UPDATE users SET failedLoginAttempts = failedLoginAttempts + 1, lastLogin = CURRENT_TIMESTAMP WHERE email = ?',
                [email]
            );
        }
    } catch (error) {
        logger.error('Error updating login attempts:', error.message);
    }
};

module.exports = {
    verifyToken,
    checkUserActive,
    checkRole,
    checkLoginAttempts,
    updateLoginAttempts
}; 
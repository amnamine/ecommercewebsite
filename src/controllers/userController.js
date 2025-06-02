const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const database = require('../utils/database');
const logger = require('../utils/logger');
const { updateLoginAttempts } = require('../middleware/auth');

// Register a new user
const register = async (req, res) => {
    try {
        const { fullName, email, password, accountType } = req.body;

        // Check if user already exists
        const existingUser = await database.getOne(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, config.saltRounds);

        // Create user
        const result = await database.run(
            `INSERT INTO users (fullName, email, password, accountType)
             VALUES (?, ?, ?, ?)`,
            [fullName, email, hashedPassword, accountType]
        );

        // Generate token
        const token = jwt.sign(
            { id: result.id, email, accountType },
            config.jwtSecret,
            { expiresIn: config.jwtExpiration }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: result.id,
                fullName,
                email,
                accountType
            }
        });
    } catch (error) {
        logger.error('Registration error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error registering user'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user
        const user = await database.getOne(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            await updateLoginAttempts(email, false);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or has been suspended'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            await updateLoginAttempts(email, false);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update login attempts and last login
        await updateLoginAttempts(email, true);

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, accountType: user.accountType },
            config.jwtSecret,
            { expiresIn: config.jwtExpiration }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                accountType: user.accountType
            }
        });
    } catch (error) {
        logger.error('Login error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await database.getOne(
            'SELECT id, fullName, email, accountType, createdAt FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        logger.error('Get profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { fullName, currentPassword, newPassword } = req.body;
        const updates = [];
        const params = [];

        if (fullName) {
            updates.push('fullName = ?');
            params.push(fullName);
        }

        if (newPassword) {
            // Verify current password
            const user = await database.getOne(
                'SELECT password FROM users WHERE id = ?',
                [req.user.id]
            );

            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, config.saltRounds);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided'
            });
        }

        params.push(req.user.id);
        await database.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        logger.error('Update profile error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await database.query(
            'SELECT id, fullName, email, accountType, createdAt, lastLogin, isActive FROM users'
        );

        res.json({
            success: true,
            users
        });
    } catch (error) {
        logger.error('Get all users error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

// Admin: Update user status
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        await database.run(
            'UPDATE users SET isActive = ? WHERE id = ?',
            [isActive, userId]
        );

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    } catch (error) {
        logger.error('Update user status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating user status'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    getAllUsers,
    updateUserStatus
}; 
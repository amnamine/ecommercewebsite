// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const morgan = require('morgan');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');

// Configure logger
const loggerWinston = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    loggerWinston.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;
const JWT_SECRET = process.env.JWT_SECRET;

// Security middleware
app.use(helmet(config.security));
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use(limiter);

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Setup ---
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        loggerWinston.error('Error opening database:', err.message);
    } else {
        loggerWinston.info('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        accountType TEXT NOT NULL CHECK(accountType IN ('buyer', 'seller', 'admin')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLogin DATETIME,
        failedLoginAttempts INTEGER DEFAULT 0
    )`, (err) => {
        if (err) {
            loggerWinston.error("Error creating users table:", err.message);
        } else {
            loggerWinston.info("Users table checked/created successfully.");
            createDefaultAdmin();
        }
    });

    // Create products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        imageUrl TEXT,
        stock INTEGER DEFAULT 0,
        sellerId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sellerId) REFERENCES users(id)
    )`, (err) => {
        if (err) loggerWinston.error("Error creating products table:", err.message);
        else loggerWinston.info("Products table checked/created successfully.");
    });
}

function createDefaultAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    db.get('SELECT * FROM users WHERE email = ? AND accountType = ?', [adminEmail, 'admin'], (err, row) => {
        if (err) {
            loggerWinston.error('Error checking for admin user:', err.message);
            return;
        }
        if (!row) {
            bcrypt.hash(adminPassword, SALT_ROUNDS, (err, hashedPassword) => {
                if (err) {
                    loggerWinston.error('Error hashing admin password:', err.message);
                    return;
                }
                db.run('INSERT INTO users (fullName, email, password, accountType) VALUES (?, ?, ?, ?)',
                    ['Admin User', adminEmail, hashedPassword, 'admin'],
                    (err) => {
                        if (err) {
                            loggerWinston.error('Error creating default admin user:', err.message);
                        } else {
                            loggerWinston.info(`Default admin user created: ${adminEmail}`);
                        }
                    }
                );
            });
        } else {
            loggerWinston.info('Admin user already exists.');
        }
    });
}

// Validation middleware
const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
        .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('fullName').trim().notEmpty(),
    body('accountType').isIn(['buyer', 'seller'])
];

// Registration Route
app.post('/api/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password, accountType } = req.body;

    try {
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                loggerWinston.error("Database error during registration check:", err.message);
                return res.status(500).json({ message: 'Server error during registration.' });
            }
            if (row) {
                return res.status(409).json({ message: 'Email already registered.' });
            }

            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const sql = 'INSERT INTO users (fullName, email, password, accountType) VALUES (?, ?, ?, ?)';
            db.run(sql, [fullName, email, hashedPassword, accountType], function(err) {
                if (err) {
                    loggerWinston.error("Database error during user insertion:", err.message);
                    return res.status(500).json({ message: 'Could not register user.' });
                }
                res.status(201).json({ message: 'User registered successfully!', userId: this.lastID });
            });
        });
    } catch (error) {
        loggerWinston.error('Error during registration process:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Login Route
app.post('/api/login', limiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const sql = 'SELECT * FROM users WHERE email = ?';
        db.get(sql, [email], async (err, user) => {
            if (err) {
                loggerWinston.error("Database error during login:", err.message);
                return res.status(500).json({ message: 'Server error during login.' });
            }
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                // Update failed login attempts
                db.run('UPDATE users SET failedLoginAttempts = failedLoginAttempts + 1 WHERE id = ?', [user.id]);
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // Reset failed login attempts and update last login
            db.run('UPDATE users SET failedLoginAttempts = 0, lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            const tokenPayload = {
                userId: user.id,
                email: user.email,
                accountType: user.accountType,
                fullName: user.fullName
            };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login successful!',
                token: token,
                user: tokenPayload
            });
        });
    } catch (error) {
        loggerWinston.error('Error during login process:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- JWT Authentication Middleware (Example for protected routes) ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'No token provided. Access denied.' }); // Unauthorized
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Token expired. Please login again.' }); // Forbidden
            }
            return res.status(403).json({ message: 'Invalid token. Access denied.' }); // Forbidden
        }
        req.user = user; // Add decoded user payload to request object
        next(); // Proceed to the protected route
    });
}

// Example Protected Route (e.g., get user profile)
app.get('/api/profile', authenticateToken, (req, res) => {
    // req.user is available here from the authenticateToken middleware
    // Fetch more detailed profile from DB if needed
    db.get('SELECT id, fullName, email, accountType, createdAt FROM users WHERE id = ?', [req.user.userId], (err, profile) => {
        if (err) {
            console.error("Database error fetching profile:", err.message);
            return res.status(500).json({ message: 'Error fetching profile data.' });
        }
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found.' });
        }
        res.status(200).json(profile);
    });
});

// --- HTML File Serving (Ensure these are at the root or adjust paths) ---
// It's generally better to have a dedicated '/public' folder for client-side assets.
// If your HTML files (index.html, login.html, register.html) are in the root:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});
// Add routes for account_buyer.html, account_seller.html, account_admin.html if they exist
app.get('/account_buyer.html', authenticateToken, (req, res) => { // Example: protect account page
    if (req.user.accountType !== 'buyer' && req.user.accountType !== 'admin') {
        return res.status(403).send('Access Denied: Buyers or Admins only.');
    }
    res.sendFile(path.join(__dirname, 'account_buyer.html'));
});
app.get('/account_seller.html', authenticateToken, (req, res) => {
    if (req.user.accountType !== 'seller' && req.user.accountType !== 'admin') {
        return res.status(403).send('Access Denied: Sellers or Admins only.');
    }
    res.sendFile(path.join(__dirname, 'account_seller.html'));
});
app.get('/account_admin.html', authenticateToken, (req, res) => {
    if (req.user.accountType !== 'admin') {
        return res.status(403).send('Access Denied: Admins only.');
    }
    res.sendFile(path.join(__dirname, 'account_admin.html'));
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    loggerWinston.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    loggerWinston.info(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    loggerWinston.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    loggerWinston.error('Unhandled Rejection:', error);
    process.exit(1);
});

module.exports = app;

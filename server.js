// server.js
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Use verbose for more detailed error messages
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For JSON Web Tokens
const crypto = require('crypto'); // For generating JWT secret

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10; // For bcrypt password hashing
const JWT_SECRET = crypto.randomBytes(64).toString('hex'); // Generate a secure random secret for JWT

// --- Database Setup ---
// Initialize SQLite database
// The database file will be created in the project root if it doesn't exist.
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            accountType TEXT NOT NULL CHECK(accountType IN ('buyer', 'seller', 'admin')),
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating users table:", err.message);
            } else {
                console.log("Users table checked/created successfully.");
                // Optional: Create an admin user if one doesn't exist
                createDefaultAdmin();
            }
        });
        // Placeholder for products table (expand later)
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT,
            imageUrl TEXT,
            stock INTEGER DEFAULT 0,
            sellerId INTEGER, /* To link to a seller user */
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sellerId) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error("Error creating products table:", err.message);
            else console.log("Products table checked/created successfully.");
        });
    }
});

function createDefaultAdmin() {
    const adminEmail = 'admin@electromart.com';
    const adminPassword = 'SecureAdminPassword123!'; // Change this in a real app

    db.get('SELECT * FROM users WHERE email = ? AND accountType = ?', [adminEmail, 'admin'], (err, row) => {
        if (err) {
            console.error('Error checking for admin user:', err.message);
            return;
        }
        if (!row) {
            bcrypt.hash(adminPassword, SALT_ROUNDS, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing admin password:', err.message);
                    return;
                }
                db.run('INSERT INTO users (fullName, email, password, accountType) VALUES (?, ?, ?, ?)',
                    ['Admin User', adminEmail, hashedPassword, 'admin'],
                    (err) => {
                        if (err) {
                            console.error('Error creating default admin user:', err.message);
                        } else {
                            console.log(`Default admin user created: ${adminEmail}`);
                            console.log(`IMPORTANT: Default admin password is "${adminPassword}". Please change this immediately if this were a production system.`);
                        }
                    }
                );
            });
        } else {
            console.log('Admin user already exists.');
        }
    });
}


// --- Middleware ---
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Serve static files (HTML, CSS, JS from the root directory)
// This assumes your HTML files (index.html, login.html, etc.) are in the root or a 'public' folder.
// For simplicity, let's assume they are in the root alongside server.js.
app.use(express.static(path.join(__dirname, '.'))); // Serves files from the current directory

// --- API Routes ---

// Registration Route
app.post('/api/register', async (req, res) => {
    const { fullName, email, password, accountType } = req.body;

    // Basic validation
    if (!fullName || !email || !password || !accountType) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!['buyer', 'seller'].includes(accountType)) { // Admin accounts should be created differently
        return res.status(400).json({ message: 'Invalid account type.' });
    }

    try {
        // Check if user already exists
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error("Database error during registration check:", err.message);
                return res.status(500).json({ message: 'Server error during registration.' });
            }
            if (row) {
                return res.status(409).json({ message: 'Email already registered.' }); // 409 Conflict
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Insert user into database
            const sql = 'INSERT INTO users (fullName, email, password, accountType) VALUES (?, ?, ?, ?)';
            db.run(sql, [fullName, email, hashedPassword, accountType], function(err) { // Use function for this.lastID
                if (err) {
                    console.error("Database error during user insertion:", err.message);
                    return res.status(500).json({ message: 'Could not register user.' });
                }
                res.status(201).json({ message: 'User registered successfully!', userId: this.lastID });
            });
        });
    } catch (error) {
        console.error('Error during registration process:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error("Database error during login:", err.message);
            return res.status(500).json({ message: 'Server error during login.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials. User not found.' }); // Unauthorized
        }

        // Compare submitted password with stored hashed password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' }); // Unauthorized
        }

        // Passwords match, create JWT
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            accountType: user.accountType,
            fullName: user.fullName
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

        res.status(200).json({
            message: 'Login successful!',
            token: token,
            user: tokenPayload // Send some user info back
        });
    });
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


// --- Global Error Handler (Basic) ---
// This should be the last middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).send('Something broke on the server!');
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`JWT Secret (for debugging, DO NOT expose in production): ${JWT_SECRET.substring(0,10)}...`);
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

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

class Database {
    constructor() {
        this.db = null;
        this.initialize();
    }

    initialize() {
        const dbPath = path.resolve(__dirname, '../../', config.database.path);
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                logger.error('Error opening database:', err.message);
                throw err;
            }
            logger.info('Connected to the SQLite database.');
            this.setupDatabase();
        });

        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        // Enable WAL mode for better concurrency
        this.db.run('PRAGMA journal_mode = WAL');
    }

    setupDatabase() {
        const queries = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fullName TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                accountType TEXT NOT NULL CHECK(accountType IN ('buyer', 'seller', 'admin')),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastLogin DATETIME,
                failedLoginAttempts INTEGER DEFAULT 0,
                isActive BOOLEAN DEFAULT 1
            )`,
            
            // Products table
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                sellerId INTEGER NOT NULL,
                category TEXT NOT NULL,
                imageUrl TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Orders table
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                buyerId INTEGER NOT NULL,
                totalAmount REAL NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Order items table
            `CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orderId INTEGER NOT NULL,
                productId INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
            )`
        ];

        // Execute each query
        queries.forEach(query => {
            this.db.run(query, (err) => {
                if (err) {
                    logger.error('Error creating table:', err.message);
                }
            });
        });

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_products_seller ON products(sellerId)',
            'CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyerId)',
            'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(orderId)'
        ];

        indexes.forEach(index => {
            this.db.run(index, (err) => {
                if (err) {
                    logger.error('Error creating index:', err.message);
                }
            });
        });

        // Create default admin user if not exists
        this.createDefaultAdmin();
    }

    async createDefaultAdmin() {
        const bcrypt = require('bcrypt');
        const { admin } = config;

        try {
            const hashedPassword = await bcrypt.hash(admin.password, config.saltRounds);
            
            this.db.run(
                `INSERT OR IGNORE INTO users (fullName, email, password, accountType)
                 VALUES (?, ?, ?, ?)`,
                ['Admin', admin.email, hashedPassword, 'admin'],
                (err) => {
                    if (err) {
                        logger.error('Error creating admin user:', err.message);
                    } else {
                        logger.info('Admin user checked/created successfully.');
                    }
                }
            );
        } catch (error) {
            logger.error('Error hashing admin password:', error.message);
        }
    }

    // Helper methods for common database operations
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    logger.error('Database query error:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getOne(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    logger.error('Database getOne error:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    logger.error('Database run error:', err.message);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err.message);
                    reject(err);
                } else {
                    logger.info('Database connection closed.');
                    resolve();
                }
            });
        });
    }
}

// Create and export a singleton instance
const database = new Database();
module.exports = database; 
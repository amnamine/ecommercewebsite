const database = require('../utils/database');
const logger = require('../utils/logger');

// Create a new product
const createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, category, imageUrl } = req.body;
        const sellerId = req.user.id;

        const result = await database.run(
            `INSERT INTO products (name, description, price, stock, category, imageUrl, sellerId)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, description, price, stock, category, imageUrl, sellerId]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            productId: result.id
        });
    } catch (error) {
        logger.error('Create product error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error creating product'
        });
    }
};

// Get all products with pagination and filters
const getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            search,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';

        // Build where clause based on filters
        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        if (minPrice) {
            whereClause += ' AND price >= ?';
            params.push(minPrice);
        }

        if (maxPrice) {
            whereClause += ' AND price <= ?';
            params.push(maxPrice);
        }

        if (search) {
            whereClause += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Get total count
        const countResult = await database.getOne(
            `SELECT COUNT(*) as total FROM products WHERE 1=1 ${whereClause}`,
            params
        );

        // Get products
        const products = await database.query(
            `SELECT p.*, u.fullName as sellerName
             FROM products p
             JOIN users u ON p.sellerId = u.id
             WHERE 1=1 ${whereClause}
             ORDER BY ${sortBy} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            products,
            pagination: {
                total: countResult.total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        logger.error('Get products error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
};

// Get product by ID
const getProductById = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await database.getOne(
            `SELECT p.*, u.fullName as sellerName
             FROM products p
             JOIN users u ON p.sellerId = u.id
             WHERE p.id = ?`,
            [productId]
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        logger.error('Get product by ID error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching product'
        });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, price, stock, category, imageUrl } = req.body;

        // Check if product exists and belongs to seller
        const product = await database.getOne(
            'SELECT sellerId FROM products WHERE id = ?',
            [productId]
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.sellerId !== req.user.id && req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this product'
            });
        }

        // Update product
        await database.run(
            `UPDATE products
             SET name = ?, description = ?, price = ?, stock = ?, category = ?, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, description, price, stock, category, imageUrl, productId]
        );

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        logger.error('Update product error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if product exists and belongs to seller
        const product = await database.getOne(
            'SELECT sellerId FROM products WHERE id = ?',
            [productId]
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (product.sellerId !== req.user.id && req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this product'
            });
        }

        // Delete product
        await database.run('DELETE FROM products WHERE id = ?', [productId]);

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        logger.error('Delete product error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
};

// Get seller's products
const getSellerProducts = async (req, res) => {
    try {
        const products = await database.query(
            'SELECT * FROM products WHERE sellerId = ? ORDER BY createdAt DESC',
            [req.user.id]
        );

        res.json({
            success: true,
            products
        });
    } catch (error) {
        logger.error('Get seller products error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching seller products'
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getSellerProducts
}; 
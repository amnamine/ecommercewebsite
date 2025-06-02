const database = require('../utils/database');
const logger = require('../utils/logger');

// Create a new order
const createOrder = async (req, res) => {
    try {
        const { items } = req.body;
        const buyerId = req.user.id;

        // Start transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Calculate total amount and validate stock
            let totalAmount = 0;
            for (const item of items) {
                const product = await database.getOne(
                    'SELECT price, stock FROM products WHERE id = ?',
                    [item.productId]
                );

                if (!product) {
                    throw new Error(`Product with ID ${item.productId} not found`);
                }

                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ID ${item.productId}`);
                }

                totalAmount += product.price * item.quantity;

                // Update stock
                await database.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.productId]
                );
            }

            // Create order
            const orderResult = await database.run(
                `INSERT INTO orders (buyerId, totalAmount, status)
                 VALUES (?, ?, 'pending')`,
                [buyerId, totalAmount]
            );

            // Create order items
            for (const item of items) {
                await database.run(
                    `INSERT INTO order_items (orderId, productId, quantity, price)
                     VALUES (?, ?, ?, ?)`,
                    [orderResult.id, item.productId, item.quantity, item.price]
                );
            }

            // Commit transaction
            await database.run('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                orderId: orderResult.id
            });
        } catch (error) {
            // Rollback transaction on error
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error('Create order error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Error creating order'
        });
    }
};

// Get order by ID
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await database.getOne(
            `SELECT o.*, u.fullName as buyerName
             FROM orders o
             JOIN users u ON o.buyerId = u.id
             WHERE o.id = ?`,
            [orderId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is authorized to view this order
        if (order.buyerId !== req.user.id && req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        // Get order items
        const items = await database.query(
            `SELECT oi.*, p.name as productName, p.imageUrl
             FROM order_items oi
             JOIN products p ON oi.productId = p.id
             WHERE oi.orderId = ?`,
            [orderId]
        );

        res.json({
            success: true,
            order: {
                ...order,
                items
            }
        });
    } catch (error) {
        logger.error('Get order by ID error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching order'
        });
    }
};

// Get user's orders
const getUserOrders = async (req, res) => {
    try {
        const orders = await database.query(
            `SELECT o.*, 
                    (SELECT COUNT(*) FROM order_items WHERE orderId = o.id) as itemCount
             FROM orders o
             WHERE o.buyerId = ?
             ORDER BY o.createdAt DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        logger.error('Get user orders error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Check if order exists
        const order = await database.getOne(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is authorized to update this order
        if (order.buyerId !== req.user.id && req.user.accountType !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        // Update status
        await database.run(
            'UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId]
        );

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        logger.error('Update order status error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
};

// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Start transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Check if order exists and can be cancelled
            const order = await database.getOne(
                'SELECT * FROM orders WHERE id = ?',
                [orderId]
            );

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.buyerId !== req.user.id && req.user.accountType !== 'admin') {
                throw new Error('Not authorized to cancel this order');
            }

            if (order.status !== 'pending') {
                throw new Error('Only pending orders can be cancelled');
            }

            // Get order items
            const items = await database.query(
                'SELECT * FROM order_items WHERE orderId = ?',
                [orderId]
            );

            // Restore product stock
            for (const item of items) {
                await database.run(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.productId]
                );
            }

            // Update order status
            await database.run(
                'UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
                ['cancelled', orderId]
            );

            // Commit transaction
            await database.run('COMMIT');

            res.json({
                success: true,
                message: 'Order cancelled successfully'
            });
        } catch (error) {
            // Rollback transaction on error
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error('Cancel order error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Error cancelling order'
        });
    }
};

module.exports = {
    createOrder,
    getOrderById,
    getUserOrders,
    updateOrderStatus,
    cancelOrder
}; 
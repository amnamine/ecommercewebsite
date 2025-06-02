const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const { verifyToken, checkUserActive, checkRole } = require('../middleware/auth');
const {
    registerValidation,
    loginValidation,
    productValidation,
    orderValidation,
    profileUpdateValidation
} = require('../middleware/validation');

// Auth routes
router.post('/auth/register', registerValidation, userController.register);
router.post('/auth/login', loginValidation, userController.login);

// Protected routes
router.use(verifyToken);
router.use(checkUserActive);

// User routes
router.get('/users/profile', userController.getProfile);
router.put('/users/profile', profileUpdateValidation, userController.updateProfile);

// Product routes
router.get('/products', productController.getProducts);
router.get('/products/:productId', productController.getProductById);
router.post('/products', checkRole(['seller', 'admin']), productValidation, productController.createProduct);
router.put('/products/:productId', checkRole(['seller', 'admin']), productValidation, productController.updateProduct);
router.delete('/products/:productId', checkRole(['seller', 'admin']), productController.deleteProduct);
router.get('/products/seller/me', checkRole(['seller']), productController.getSellerProducts);

// Order routes
router.post('/orders', checkRole(['buyer']), orderValidation, orderController.createOrder);
router.get('/orders/:orderId', orderController.getOrderById);
router.get('/orders/user/me', checkRole(['buyer']), orderController.getUserOrders);
router.put('/orders/:orderId/status', checkRole(['admin']), orderController.updateOrderStatus);
router.post('/orders/:orderId/cancel', orderController.cancelOrder);

// Admin routes
router.get('/admin/users', checkRole(['admin']), userController.getAllUsers);
router.put('/admin/users/:userId/status', checkRole(['admin']), userController.updateUserStatus);

module.exports = router; 
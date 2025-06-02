const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation failed:', errors.array());
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// User registration validation
const registerValidation = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]*$/)
        .withMessage('Full name can only contain letters and spaces'),
    
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('accountType')
        .isIn(['buyer', 'seller'])
        .withMessage('Account type must be either buyer or seller'),
    
    validate
];

// Login validation
const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    validate
];

// Product validation
const productValidation = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Product name must be between 3 and 100 characters'),
    
    body('description')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),
    
    body('price')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be greater than 0'),
    
    body('stock')
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    
    body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    
    body('imageUrl')
        .optional()
        .isURL()
        .withMessage('Image URL must be a valid URL'),
    
    validate
];

// Order validation
const orderValidation = [
    body('items')
        .isArray()
        .withMessage('Items must be an array')
        .notEmpty()
        .withMessage('Order must contain at least one item'),
    
    body('items.*.productId')
        .isInt()
        .withMessage('Product ID must be an integer'),
    
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    
    validate
];

// Profile update validation
const profileUpdateValidation = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]*$/)
        .withMessage('Full name can only contain letters and spaces'),
    
    body('currentPassword')
        .optional()
        .notEmpty()
        .withMessage('Current password is required when changing password'),
    
    body('newPassword')
        .optional()
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    productValidation,
    orderValidation,
    profileUpdateValidation
}; 
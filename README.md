# ElectroMart E-commerce Platform

A modern e-commerce platform built with Node.js, Express, and SQLite.

## Features

- User authentication and authorization
- Role-based access control (Admin, Seller, Buyer)
- Product management
- Order processing
- Secure password handling
- Rate limiting
- Input validation
- Error handling
- Logging system

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd website1
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1h
SALT_ROUNDS=10

# Database
DB_PATH=database.sqlite
DB_LOGGING=true

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Admin
ADMIN_EMAIL=admin@electromart.com
ADMIN_PASSWORD=Admin@123

# Session
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

4. Start the server:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:productId` - Get product by ID
- `POST /api/products` - Create new product (Seller/Admin)
- `PUT /api/products/:productId` - Update product (Seller/Admin)
- `DELETE /api/products/:productId` - Delete product (Seller/Admin)
- `GET /api/products/seller/me` - Get seller's products

### Orders

- `POST /api/orders` - Create new order (Buyer)
- `GET /api/orders/:orderId` - Get order by ID
- `GET /api/orders/user/me` - Get user's orders (Buyer)
- `PUT /api/orders/:orderId/status` - Update order status (Admin)
- `POST /api/orders/:orderId/cancel` - Cancel order

### Admin

- `GET /api/admin/users` - Get all users (Admin)
- `PUT /api/admin/users/:userId/status` - Update user status (Admin)

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting for API endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers
- SQL injection prevention
- XSS protection

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Logging

Logs are stored in the `logs` directory:

- `app.log` - General application logs
- `error.log` - Error logs

## Development

1. Install development dependencies:

```bash
npm install --save-dev nodemon
```

2. Start development server:

```bash
npm run dev
```

## Testing

1. Install test dependencies:

```bash
npm install --save-dev jest supertest
```

2. Run tests:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@electromart.com or create an issue in the repository.

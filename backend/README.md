# Personal Finance Tracker - Backend API

A comprehensive Node.js backend API for personal finance tracking with OCR receipt processing, transaction management, category organization, and analytics.

## Features

### Core Features
- **User Authentication** - JWT-based authentication with secure password hashing
- **Transaction Management** - Full CRUD operations for income and expense tracking
- **Category Management** - Customizable categories with default presets
- **Receipt Processing** - OCR-powered receipt scanning with automatic data extraction
- **Analytics & Reports** - Comprehensive financial analytics and trend analysis

### Advanced Features
- **File Upload** - Secure image and PDF receipt upload with validation
- **Data Export** - CSV and JSON export capabilities
- **Bulk Operations** - Bulk delete and manage multiple transactions
- **Search & Filter** - Advanced filtering and pagination
- **Dashboard** - Real-time financial overview and statistics

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: Multer, Sharp, Tesseract.js
- **Validation**: Joi
- **Security**: Helmet, bcryptjs, rate limiting
- **Logging**: Winston
- **Environment**: dotenv

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/finance_tracker
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=90d
   
   # Server
   PORT=5000
   NODE_ENV=development
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update user profile
- `PATCH /api/auth/change-password` - Change password
- `GET /api/auth/dashboard` - Dashboard statistics
- `POST /api/auth/logout` - Logout user

### Transactions
- `GET /api/transactions` - Get all transactions (with filtering)
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:id` - Get single transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/bulk-delete` - Bulk delete transactions
- `POST /api/transactions/:id/duplicate` - Duplicate transaction
- `GET /api/transactions/summary/date-range` - Transaction summary
- `GET /api/transactions/export/data` - Export transactions

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `GET /api/categories/:id` - Get single category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `GET /api/categories/analytics/stats` - Category statistics
- `GET /api/categories/analytics/popular` - Popular categories
- `POST /api/categories/reset-defaults` - Reset to default categories

### Receipts
- `GET /api/receipts` - Get all receipts
- `POST /api/receipts` - Upload new receipt
- `GET /api/receipts/:id` - Get single receipt
- `PATCH /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt
- `POST /api/receipts/:id/reprocess` - Reprocess OCR
- `POST /api/receipts/:id/create-transaction` - Create transaction from receipt
- `PATCH /api/receipts/:id/unlink-transaction` - Unlink from transaction
- `GET /api/receipts/analytics/stats` - Receipt statistics

### Analytics
- `GET /api/analytics/dashboard` - Dashboard overview
- `GET /api/analytics/trends` - Spending trends
- `GET /api/analytics/categories` - Category breakdown
- `GET /api/analytics/monthly-comparison` - Monthly comparison
- `GET /api/analytics/budget` - Budget analysis
- `GET /api/analytics/export` - Export analytics data

## API Documentation

### Query Parameters

#### Filtering
```
GET /api/transactions?type=expense&categoryId=123&startDate=2024-01-01&endDate=2024-01-31
```

#### Pagination
```
GET /api/transactions?page=1&limit=10
```

#### Sorting
```
GET /api/transactions?sort=-date,amount
```

### Request Examples

#### Create Transaction
```json
POST /api/transactions
{
  "type": "expense",
  "amount": 25.50,
  "description": "Coffee and pastry",
  "categoryId": "64f123456789abcd12345678",
  "date": "2024-01-15T10:30:00Z",
  "paymentMethod": "card",
  "location": "Local Coffee Shop",
  "notes": "Morning meeting coffee"
}
```

#### Upload Receipt
```
POST /api/receipts
Content-Type: multipart/form-data

receipt: [file]
description: "Grocery shopping"
notes: "Weekly groceries"
```

### Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "pagination": {  // Only for paginated responses
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## File Upload

### Supported Formats
- **Images**: JPEG, PNG, GIF, WebP (up to 10MB)
- **Documents**: PDF (up to 10MB)

### Upload Directory Structure
```
uploads/
├── receipts/          # Receipt images and PDFs
└── temp/             # Temporary files
```

## OCR Processing

The system uses Tesseract.js for OCR processing with:

- **Image preprocessing** with Sharp
- **Confidence scoring** for extracted text
- **Smart parsing** for amounts, dates, merchants
- **Category suggestions** based on merchant names
- **Retry logic** for failed processing

### Extracted Data Format
```json
{
  "merchant": "Target Store",
  "totalAmount": 45.67,
  "date": "2024-01-15",
  "items": [
    {
      "description": "Milk",
      "amount": 3.99
    }
  ],
  "confidence": 0.85
}
```

## Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent abuse
- **Input Validation** using Joi schemas
- **File Upload Validation** with type and size limits
- **CORS Protection** for cross-origin requests
- **Helmet Security** headers

## Error Handling

The API provides comprehensive error handling:

```json
{
  "success": false,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be a positive number"
      }
    ]
  }
}
```

## Logging

Winston logging with:
- **File rotation** for log management
- **Different log levels** (error, warn, info, debug)
- **Structured logging** for better analysis
- **Environment-based** configuration

## Database Schema

### Collections
- **users** - User accounts and preferences
- **categories** - Income/expense categories
- **transactions** - Financial transactions
- **receipts** - Uploaded receipts with OCR data

### Key Relationships
- Users have many categories and transactions
- Transactions belong to categories and users
- Receipts can be linked to transactions
- Categories have default presets

## Development

### Scripts
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm test           # Run tests (if configured)
npm run lint       # Run ESLint
```

### Environment Variables
See `.env.example` for all required environment variables.

### Folder Structure
```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/         # MongoDB schemas
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── server.js       # Main application file
```

## Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   ```

2. **Process Management**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name finance-api
   ```

3. **Nginx Configuration**
   ```nginx
   location /api {
     proxy_pass http://localhost:5000;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please check:
- API documentation at `/api/health`
- Log files in the `logs/` directory
- MongoDB connection and indexes

---

**Note**: This backend API is designed to work with a React frontend application. Make sure to configure CORS settings appropriately for your frontend domain.

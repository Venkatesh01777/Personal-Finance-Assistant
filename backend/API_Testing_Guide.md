# Finance Tracker API Testing Guide

## Quick Start

### 1. Import Files into Postman
1. Open Postman
2. Click "Import" button
3. Import `Finance_Tracker_API.postman_collection.json`
4. Import `Finance_Tracker_Environment.postman_environment.json`
5. Select "Finance Tracker - Development" environment

### 2. Start Your Backend Server
```bash
cd d:\venky_typeFace\backend
npm run dev
```

### 3. Testing Sequence

#### Phase 1: Authentication
1. **Register User** - Creates a new user account
2. **Login User** - Gets access token (automatically saved to environment)
3. **Get User Profile** - Verify authentication works
4. **Update User Profile** - Test profile updates

#### Phase 2: Categories
1. **Create Category** (Groceries - Expense) - Creates expense category
2. **Create Income Category** (Salary) - Creates income category
3. **Get All Categories** - List all categories
4. **Get Category by ID** - Get specific category
5. **Update Category** - Modify category details

#### Phase 3: Transactions
1. **Create Expense Transaction** - Add expense with category
2. **Create Income Transaction** - Add income transaction
3. **Get All Transactions** - List transactions with pagination
4. **Get Transactions by Type** - Filter by expense/income
5. **Get Transaction by ID** - Get specific transaction
6. **Update Transaction** - Modify transaction
7. **Search Transactions** - Search by amount/description

#### Phase 4: Receipts (Optional - requires image files)
1. **Upload Receipt** - Upload receipt image
2. **Get All Receipts** - List receipts
3. **Process Receipt OCR** - Extract text from receipt
4. **Get Receipt by ID** - Get specific receipt

#### Phase 5: Analytics
1. **Get Dashboard Summary** - Overview of finances
2. **Get Monthly Summary** - Monthly breakdown
3. **Get Category Breakdown** - Spending by category
4. **Get Spending Trends** - Historical trends
5. **Get Budget Analysis** - Budget vs actual spending
6. **Export Data** - Export transactions to CSV

#### Phase 6: Health Checks
1. **API Health Check** - Verify server status
2. **API Welcome** - Basic API info

## Sample Test Data

### User Registration
```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "phoneNumber": "+1234567890"
}
```

### Categories
```json
// Expense Category
{
  "name": "Groceries",
  "type": "expense",
  "description": "Food and household items",
  "color": "#4CAF50",
  "icon": "shopping-cart",
  "budget": {
    "monthly": 500,
    "alertThreshold": 80
  }
}

// Income Category
{
  "name": "Salary",
  "type": "income",
  "description": "Monthly salary income",
  "color": "#2196F3",
  "icon": "money"
}
```

### Transactions
```json
// Expense Transaction
{
  "type": "expense",
  "amount": 75.50,
  "description": "Weekly grocery shopping",
  "category": "{{categoryId}}",
  "paymentMethod": "credit_card",
  "merchant": "SuperMart",
  "location": "123 Main St, City",
  "tags": ["food", "weekly", "essential"],
  "notes": "Bought vegetables, fruits, and dairy products"
}

// Income Transaction
{
  "type": "income",
  "amount": 3500.00,
  "description": "Monthly salary",
  "category": "{{categoryId}}",
  "paymentMethod": "bank_transfer",
  "merchant": "Tech Corp Inc",
  "tags": ["salary", "monthly"],
  "isRecurring": true,
  "recurringDetails": {
    "frequency": "monthly",
    "interval": 1,
    "endDate": "2025-12-31"
  }
}
```

## Environment Variables

The collection uses these environment variables:
- `baseUrl`: API base URL (default: http://localhost:5000)
- `accessToken`: JWT token (auto-set after login)
- `userId`: User ID (auto-set after login)
- `categoryId`: Category ID (auto-set after category creation)
- `transactionId`: Transaction ID (auto-set after transaction creation)
- `receiptId`: Receipt ID (auto-set after receipt upload)

## Expected Responses

### Successful Registration (201)
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Successful Login (200)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john.doe@example.com"
  }
}
```

### Dashboard Summary (200)
```json
{
  "success": true,
  "data": {
    "totalIncome": 3500.00,
    "totalExpenses": 1250.75,
    "netBalance": 2249.25,
    "transactionCount": 15,
    "categorySummary": [...],
    "recentTransactions": [...],
    "budgetStatus": {...}
  }
}
```

## Error Handling

Common error responses:
- `400`: Bad Request - Invalid data
- `401`: Unauthorized - Missing/invalid token
- `403`: Forbidden - Access denied
- `404`: Not Found - Resource doesn't exist
- `422`: Validation Error - Invalid input data
- `500`: Internal Server Error

## Tips for Testing

1. **Run tests in sequence** - Some requests depend on previous ones
2. **Check environment variables** - Ensure tokens and IDs are set
3. **Monitor console** - Check for automatic variable updates
4. **Use Collection Runner** - For automated testing
5. **Test error cases** - Try invalid data to test validation
6. **Upload real images** - For receipt OCR testing

## Advanced Testing

### Bulk Testing with Collection Runner
1. Click "..." next to collection name
2. Select "Run collection"
3. Choose requests to run
4. Set iterations and delay
5. Review results

### Custom Test Scripts
Each request includes test scripts that:
- Validate response status codes
- Check response structure
- Extract and save variables
- Perform assertions

### Environment Setup for Different Stages
Create separate environments for:
- Development (localhost:5000)
- Staging (staging-api-url)
- Production (production-api-url)

## Troubleshooting

### Common Issues
1. **Server not running**: Ensure `npm run dev` is active
2. **Database connection**: Check MongoDB connection
3. **CORS errors**: Verify frontend URL in environment
4. **Token expired**: Re-login to get new token
5. **File upload fails**: Check file size and format

### Debug Steps
1. Check server console for errors
2. Verify environment variables are set
3. Test endpoints individually
4. Check request headers and body
5. Review response details in Postman

This comprehensive test suite covers all API endpoints with realistic sample data and proper error handling.

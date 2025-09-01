# Personal Finance Assistant
Demo video link : https://www.loom.com/share/317ef5204cc248dabfe61a761070bbae?sid=478cd506-d186-4bc6-b2d1-57eb2ab2067a
A comprehensive full-stack web application for managing personal finances with advanced analytics, receipt processing, and transaction management.

## 🚀 Features

### 💰 Transaction Management
- **Full CRUD Operations**: Create, read, update, and delete transactions
- **Smart Categorization**: Organize transactions with customizable categories
- **Bulk Operations**: Delete multiple transactions at once
- **Advanced Filtering**: Filter by date range, category, amount, payment method, and search terms
- **Export Functionality**: Export transactions to CSV and other formats

### 📊 Advanced Analytics Dashboard
- **Interactive Charts**: Built with Recharts for responsive, interactive visualizations
- **Multiple Chart Types**: Line charts, pie charts, bar charts, and area charts
- **Four Analytics Tabs**:
  - **Overview**: KPI cards, balance trends, and activity summary
  - **Trends**: Spending trends over time with detailed analysis
  - **Categories**: Expense and income category breakdowns with pie charts
  - **Insights**: Financial health score and personalized recommendations
- **Period Filtering**: View data by week, month, quarter, or year
- **Smart Recommendations**: AI-powered financial advice based on spending patterns

### 🧾 Receipt Processing (OCR)
- **Upload & Scan**: Upload receipt images for automatic processing
- **OCR Technology**: Extract transaction details using Tesseract.js
- **Smart Recognition**: Automatically detect merchant, amount, date, and items
- **Manual Review**: Review and edit extracted data before creating transactions
- **Multiple Formats**: Support for various image formats (JPG, PNG, etc.)

### 🏷️ Category Management
- **Custom Categories**: Create, edit, and delete custom categories
- **Default Categories**: Pre-built expense and income categories
- **Smart Assignment**: Categories automatically appear in transaction forms
- **Visual Indicators**: Color-coded categories with icons
- **Transaction Handling**: Choose to delete or reassign transactions when deleting categories

### 🔐 User Authentication
- **Secure Login/Register**: JWT-based authentication system
- **Protected Routes**: Secure access to user data
- **Session Management**: Persistent login sessions
- **User Profiles**: Manage personal information and preferences

### 📱 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive design with Tailwind CSS
- **Real-time Updates**: Live data updates across all components
- **Loading States**: Smooth loading indicators and error handling
- **Toast Notifications**: User-friendly success and error messages

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query (TanStack Query)** for state management and caching
- **React Hook Form** for form handling
- **Recharts** for data visualization
- **React Hot Toast** for notifications
- **Heroicons** for icons
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Tesseract.js** for OCR processing
- **CORS** for cross-origin requests
- **Helmet** for security headers
- **Express Rate Limit** for API protection

## 📁 Project Structure

```
Personal-Finance-Assistant/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── analytics/    # Chart components
│   │   │   ├── categories/   # Category management
│   │   │   ├── receipts/     # Receipt processing
│   │   │   └── transactions/ # Transaction components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service functions
│   │   ├── store/           # Global state management
│   │   └── types/           # TypeScript type definitions
│   └── public/              # Static assets
├── backend/                 # Node.js backend application
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   └── uploads/             # Uploaded receipt files
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Venkatesh01777/Personal-Finance-Assistant.git
   cd Personal-Finance-Assistant
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Configuration**
   
   Create a `.env` file in the backend directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/personal-finance
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

## 📈 Usage Guide

### Getting Started
1. **Register/Login**: Create an account or log in to access your personal dashboard
2. **Add Categories**: Start by creating or customizing expense and income categories
3. **Add Transactions**: Manually add transactions or upload receipts for automatic processing
4. **View Analytics**: Explore the analytics dashboard to gain insights into your spending patterns

### Key Workflows

#### Adding Transactions
- **Manual Entry**: Use the transaction form to add income/expense details
- **Receipt Upload**: Upload receipt images for automatic data extraction
- **Bulk Import**: Import multiple transactions from CSV files

#### Managing Categories
- **Create Categories**: Add custom categories with colors and icons
- **Edit Existing**: Modify category details and appearance
- **Delete Safely**: Choose to reassign or delete associated transactions

#### Analytics & Insights
- **Dashboard Overview**: View high-level financial metrics and trends
- **Detailed Analysis**: Explore spending patterns by category and time period
- **Export Data**: Download reports and transaction data for external analysis

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - Get user transactions with filtering
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `DELETE /api/transactions/bulk` - Bulk delete transactions

### Categories
- `GET /api/categories` - Get user categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Receipts
- `POST /api/receipts/upload` - Upload receipt image
- `POST /api/receipts/:id/process` - Process receipt with OCR
- `POST /api/receipts/:id/create-transaction` - Create transaction from receipt

### Analytics
- `GET /api/analytics/dashboard` - Dashboard overview data
- `GET /api/analytics/trends` - Spending trends data
- `GET /api/analytics/categories` - Category breakdown data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Recharts** for providing excellent charting components
- **Tesseract.js** for OCR capabilities
- **React Query** for efficient data management
- **Tailwind CSS** for rapid UI development
- **MongoDB** for flexible data storage

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

---

**Personal Finance Assistant** - Take control of your finances with intelligent tracking and analytics! 💰📊

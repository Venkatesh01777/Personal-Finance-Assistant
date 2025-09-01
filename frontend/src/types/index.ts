// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  data: {
    user: User;
  };
}

// Category Types
export interface Category {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  userId: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Transaction Types
export interface Transaction {
  _id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'digital_wallet' | 'other';
  location?: string;
  tags?: string[];
  notes?: string;
  receiptId?: string;
  receipt?: Receipt;
  isRecurring: boolean;
  recurringDetails?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    nextDueDate?: string;
  };
  isActive: boolean;
  createdBy: {
    source: 'manual' | 'receipt' | 'import' | 'recurring';
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
  formattedAmount?: string;
  monthYear?: string;
}

// Receipt Types
export interface Receipt {
  _id: string;
  userId: string;
  filename: string;
  originalName: string;
  filePath: string;
  mimetype: string;
  size: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  ocrResults: {
    extractedText: string;
    confidence: number;
    processedAt?: string;
    processingTime: number;
  };
  parsedData: {
    merchantName: {
      value?: string;
      confidence: number;
    };
    totalAmount: {
      value?: number;
      confidence: number;
    };
    date: {
      value?: string;
      confidence: number;
    };
    items: Array<{
      name: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      confidence: number;
    }>;
    taxAmount: {
      value?: number;
      confidence: number;
    };
    category: {
      suggested?: string;
      confidence: number;
    };
    paymentMethod: {
      value?: string;
      confidence: number;
    };
  };
  corrections?: {
    merchantName?: string;
    totalAmount?: number;
    date?: string;
    category?: string;
    notes?: string;
  };
  transactionId?: string;
  transaction?: Transaction;
  processingAttempts: number;
  lastProcessingError?: {
    message: string;
    timestamp: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
  overallConfidence?: number;
  suggestedTransaction?: {
    type: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paymentMethod: string;
    notes: string;
    receiptId: string;
  };
}

// Analytics Types
export interface DashboardStats {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    income: {
      total: number;
      count: number;
      average: number;
    };
    expenses: {
      total: number;
      count: number;
      average: number;
    };
    balance: number;
    totalTransactions: number;
  };
  topCategories: Array<{
    _id: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    total: number;
    count: number;
  }>;
  recentTransactions: Transaction[];
  receiptSummary: {
    total: number;
    processed: number;
    pending: number;
    failed: number;
  };
}

export interface SpendingTrends {
  period: string;
  groupBy: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  trends: Array<{
    date: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
  }>;
}

export interface CategoryBreakdown {
  type: string;
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalAmount: number;
  categoryCount: number;
  breakdown: Array<{
    _id: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    total: number;
    count: number;
    avgAmount: number;
    percentage: string;
  }>;
}

export interface MonthlyComparison {
  month?: {
    year: number;
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
    avgTransactionAmount: number;
    categoryBreakdown: Array<{
      _id: string;
      categoryName: string;
      categoryColor: string;
      total: number;
      count: number;
    }>;
  };
  months?: number;
  data?: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
    incomeChange?: string;
    expenseChange?: string;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  token?: string; // Optional token field for auth responses
  meta?: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Form Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber?: string;
}

export interface TransactionFormData {
  type: 'income' | 'expense';
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'digital_wallet' | 'other';
  location?: string;
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
  recurringDetails?: {
    frequency: string;
    interval: number;
    endDate?: string;
  };
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
}

// Filter Types
export interface TransactionFilters {
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  paymentMethod?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ReceiptFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Error Types
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Receipt = require('../models/Receipt');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { 
  sendSuccess, 
  sendPaginated, 
  createFilter, 
  createSort, 
  calculatePagination 
} = require('../utils/apiResponse');

/**
 * Transform transaction to have proper category mapping
 * @param {Object} transaction - Mongoose transaction object or plain object
 * @returns {Object} - Transformed transaction
 */
const transformTransaction = (transaction) => {
  const transactionObj = typeof transaction.toObject === 'function' ? transaction.toObject() : transaction;
  
  if (transactionObj.categoryId && typeof transactionObj.categoryId === 'object') {
    transactionObj.category = transactionObj.categoryId;
    transactionObj.categoryId = transactionObj.categoryId._id.toString();
  }
  
  return transactionObj;
};

/**
 * Get all transactions with filtering and pagination
 */
const getTransactions = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = calculatePagination(req.query.page, req.query.limit);
  
  // Create filter object
  const allowedFilters = [
    'type', 'categoryId', 'startDate', 'endDate', 
    'minAmount', 'maxAmount', 'search', 'paymentMethod', 'tags'
  ];
  const filter = createFilter(req.query, allowedFilters, req.user.id);
  
  // Create sort object
  const sort = createSort(req.query.sort || '-date');
  
  // Execute query with pagination
  const [transactionsRaw, total] = await Promise.all([
    Transaction.find(filter)
      .populate('categoryId', 'name color icon type')
      .populate('receiptId', 'filename originalName fileUrl')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  // Transform transactions to have proper category mapping
  const transactions = transactionsRaw.map(transformTransaction);

  sendPaginated(res, transactions, page, limit, total, 'Transactions retrieved successfully');
});

/**
 * Get single transaction by ID
 */
const getTransaction = catchAsync(async (req, res, next) => {
  const transactionRaw = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  })
  .populate('categoryId', 'name color icon type')
  .populate('receiptId', 'filename originalName fileUrl parsedData');

  if (!transactionRaw) {
    return next(new AppError('Transaction not found', 404));
  }

  // Transform transaction to have proper category mapping
  const transaction = transformTransaction(transactionRaw);

  sendSuccess(res, 200, 'Transaction retrieved successfully', transaction);
});

/**
 * Create new transaction
 */
const createTransaction = catchAsync(async (req, res, next) => {
  // Add userId to the transaction data and map category to categoryId
  const transactionData = {
    ...req.body,
    categoryId: req.body.category, // Map category field to categoryId
    userId: req.user.id
  };

  // Remove the original category field to avoid confusion
  delete transactionData.category;

  // If transaction is not recurring, remove recurringDetails from the data
  if (!transactionData.isRecurring) {
    delete transactionData.recurringDetails;
  }

  // Validate category exists and belongs to user
  const category = await Category.findOne({
    _id: transactionData.categoryId,
    userId: req.user.id,
    isActive: true
  });

  if (!category) {
    return next(new AppError('Invalid category', 400));
  }

  // Create transaction
  const transactionRaw = await Transaction.create(transactionData);

  // Populate the response
  await transactionRaw.populate('categoryId', 'name color icon type');

  // Transform transaction to have proper category mapping
  const transaction = transformTransaction(transactionRaw);

  sendSuccess(res, 201, 'Transaction created successfully', transaction);
});

/**
 * Update transaction
 */
const updateTransaction = catchAsync(async (req, res, next) => {
  // Map category to categoryId if provided
  const updateData = { ...req.body };
  if (updateData.category) {
    updateData.categoryId = updateData.category;
    delete updateData.category;
  }

  // Validate category if provided
  if (updateData.categoryId) {
    const category = await Category.findOne({
      _id: updateData.categoryId,
      userId: req.user.id,
      isActive: true
    });

    if (!category) {
      return next(new AppError('Invalid category', 400));
    }
  }

  const transactionRaw = await Transaction.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    },
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('categoryId', 'name color icon type');

  if (!transactionRaw) {
    return next(new AppError('Transaction not found', 404));
  }

  // Transform transaction to have proper category mapping
  const transaction = transformTransaction(transactionRaw);

  sendSuccess(res, 200, 'Transaction updated successfully', transaction);
});

/**
 * Delete transaction (soft delete)
 */
const deleteTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    },
    { isActive: false },
    { new: true }
  );

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  sendSuccess(res, 200, 'Transaction deleted successfully');
});

/**
 * Bulk delete transactions
 */
const bulkDeleteTransactions = catchAsync(async (req, res, next) => {
  const { transactionIds } = req.body;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return next(new AppError('Transaction IDs array is required', 400));
  }

  const result = await Transaction.updateMany(
    {
      _id: { $in: transactionIds },
      userId: req.user.id,
      isActive: true
    },
    { isActive: false }
  );

  sendSuccess(res, 200, `${result.modifiedCount} transactions deleted successfully`, {
    deletedCount: result.modifiedCount
  });
});

/**
 * Get transaction summary for a date range
 */
const getTransactionSummary = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  const summary = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  // Format the summary
  const formattedSummary = {
    income: { total: 0, count: 0, average: 0 },
    expense: { total: 0, count: 0, average: 0 },
    balance: 0,
    totalTransactions: 0
  };

  summary.forEach(item => {
    if (item._id === 'income') {
      formattedSummary.income = {
        total: item.total,
        count: item.count,
        average: item.avgAmount
      };
    } else if (item._id === 'expense') {
      formattedSummary.expense = {
        total: item.total,
        count: item.count,
        average: item.avgAmount
      };
    }
  });

  formattedSummary.balance = formattedSummary.income.total - formattedSummary.expense.total;
  formattedSummary.totalTransactions = formattedSummary.income.count + formattedSummary.expense.count;

  sendSuccess(res, 200, 'Transaction summary retrieved successfully', formattedSummary);
});

/**
 * Duplicate transaction
 */
const duplicateTransaction = catchAsync(async (req, res, next) => {
  const originalTransaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!originalTransaction) {
    return next(new AppError('Transaction not found', 404));
  }

  // Create new transaction based on original
  const duplicateData = {
    ...originalTransaction.toObject(),
    _id: undefined,
    date: new Date(), // Set to current date
    description: `${originalTransaction.description} (Copy)`,
    receiptId: null, // Don't copy receipt reference
    createdAt: undefined,
    updatedAt: undefined
  };

  const newTransactionRaw = await Transaction.create(duplicateData);
  await newTransactionRaw.populate('categoryId', 'name color icon type');

  // Transform transaction to have proper category mapping
  const newTransaction = transformTransaction(newTransactionRaw);

  sendSuccess(res, 201, 'Transaction duplicated successfully', newTransaction);
});

/**
 * Get transactions by category
 */
const getTransactionsByCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.params;
  const { page, limit, skip } = calculatePagination(req.query.page, req.query.limit);

  // Verify category belongs to user
  const category = await Category.findOne({
    _id: categoryId,
    userId: req.user.id,
    isActive: true
  });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const filter = {
    userId: req.user.id,
    categoryId,
    isActive: true
  };

  // Add date range if provided
  if (req.query.startDate && req.query.endDate) {
    filter.date = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }

  const [transactionsRaw, total] = await Promise.all([
    Transaction.find(filter)
      .populate('categoryId', 'name color icon type')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  // Transform transactions to have proper category mapping
  const transactions = transactionsRaw.map(transformTransaction);

  const responseData = {
    category,
    transactions
  };

  sendPaginated(res, responseData, page, limit, total, 'Category transactions retrieved successfully');
});

/**
 * Export transactions to CSV format
 */
const exportTransactions = catchAsync(async (req, res, next) => {
  const { startDate, endDate, format = 'json' } = req.query;

  const filter = {
    userId: req.user.id,
    isActive: true
  };

  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const transactions = await Transaction.find(filter)
    .populate('categoryId', 'name')
    .sort({ date: -1 });

  if (format === 'csv') {
    // Convert to CSV format
    const csvHeader = 'Date,Type,Amount,Description,Category,Payment Method,Location,Notes\n';
    const csvRows = transactions.map(transaction => [
      transaction.date.toISOString().split('T')[0],
      transaction.type,
      transaction.amount,
      `"${transaction.description}"`,
      transaction.categoryId.name,
      transaction.paymentMethod || '',
      transaction.location || '',
      `"${transaction.notes || ''}"`
    ].join(',')).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    return res.send(csvContent);
  }

  sendSuccess(res, 200, 'Transactions exported successfully', transactions);
});

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  getTransactionSummary,
  duplicateTransaction,
  getTransactionsByCategory,
  exportTransactions
};

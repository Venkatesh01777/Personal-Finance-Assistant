const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Receipt = require('../models/Receipt');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Get dashboard overview
 */
const getDashboardOverview = catchAsync(async (req, res, next) => {
  const { period = 'year' } = req.query; // Changed default from 'month' to 'year'
  
  // Calculate date range
  const now = new Date();
  let startDate, endDate = now;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      // Get all transactions ever (for testing)
      startDate = new Date(2020, 0, 1); // Start from 2020
      break;
    default:
      startDate = new Date(now.getFullYear(), 0, 1); // Default to current year
  }

  const [
    periodSummary,
    topCategories,
    recentTransactions,
    receiptStats
  ] = await Promise.all([
    // Period summary - Use proper date filtering based on period
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
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
    ]),

    // Top spending categories
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          categoryColor: { $first: '$category.color' },
          categoryIcon: { $first: '$category.icon' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]),

    // Recent transactions - Show more transactions
    Transaction.find({
      userId: req.user.id,
      isActive: true
    })
    .populate('categoryId', 'name color icon')
    .sort({ date: -1 })
    .limit(20), // Increased from 5 to 20

    // Receipt stats
    Receipt.aggregate([
      {
        $match: {
          userId: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // Format period summary
  const summary = {
    income: { total: 0, count: 0, average: 0 },
    expenses: { total: 0, count: 0, average: 0 },
    balance: 0,
    totalTransactions: 0
  };

  periodSummary.forEach(item => {
    if (item._id === 'income') {
      summary.income = {
        total: item.total,
        count: item.count,
        average: item.avgAmount
      };
    } else if (item._id === 'expense') {
      summary.expenses = {
        total: item.total,
        count: item.count,
        average: item.avgAmount
      };
    }
  });

  summary.balance = summary.income.total - summary.expenses.total;
  summary.totalTransactions = summary.income.count + summary.expenses.count;

  // Format receipt stats
  const receiptSummary = {
    total: 0,
    processed: 0,
    pending: 0,
    failed: 0
  };

  receiptStats.forEach(stat => {
    receiptSummary.total += stat.count;
    receiptSummary[stat._id] = stat.count;
  });

  const dashboardData = {
    period,
    dateRange: { startDate, endDate },
    summary,
    topCategories,
    recentTransactions,
    receiptSummary
  };

  sendSuccess(res, 200, 'Dashboard overview retrieved successfully', dashboardData);
});

/**
 * Get spending trends over time
 */
const getSpendingTrends = catchAsync(async (req, res, next) => {
  const { period = 'year', groupBy = 'month' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate, endDate = now;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'last6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case 'last12months':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), 0, 1); // Default to current year
  }

  // Determine grouping format
  let dateGroupFormat;
  switch (groupBy) {
    case 'day':
      dateGroupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' }
      };
      break;
    case 'week':
      dateGroupFormat = {
        year: { $year: '$date' },
        week: { $week: '$date' }
      };
      break;
    case 'month':
      dateGroupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' }
      };
      break;
    default:
      dateGroupFormat = {
        year: { $year: '$date' },
        month: { $month: '$date' },
        day: { $dayOfMonth: '$date' }
      };
  }

  const trends = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          ...dateGroupFormat,
          type: '$type'
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
    }
  ]);

  // Format the results
  const formattedTrends = {};
  trends.forEach(trend => {
    let dateKey;
    if (groupBy === 'day') {
      dateKey = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}-${String(trend._id.day).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      dateKey = `${trend._id.year}-W${String(trend._id.week).padStart(2, '0')}`;
    } else if (groupBy === 'month') {
      dateKey = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`;
    }

    if (!formattedTrends[dateKey]) {
      formattedTrends[dateKey] = {
        date: dateKey,
        income: 0,
        expenses: 0,
        net: 0,
        transactionCount: 0
      };
    }

    formattedTrends[dateKey][trend._id.type === 'income' ? 'income' : 'expenses'] = trend.total;
    formattedTrends[dateKey].transactionCount += trend.count;
  });

  // Calculate net for each period
  Object.values(formattedTrends).forEach(period => {
    period.net = period.income - period.expenses;
  });

  sendSuccess(res, 200, 'Spending trends retrieved successfully', {
    period,
    groupBy,
    dateRange: { startDate, endDate },
    trends: Object.values(formattedTrends)
  });
});

/**
 * Get category breakdown for charts
 */
const getCategoryBreakdown = catchAsync(async (req, res, next) => {
  const { type = 'expense', period = 'month' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate, endDate = now;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type: type,
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$categoryId',
        categoryName: { $first: '$category.name' },
        categoryColor: { $first: '$category.color' },
        categoryIcon: { $first: '$category.icon' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { total: -1 } }
  ]);

  // Calculate percentages
  const totalAmount = breakdown.reduce((sum, item) => sum + item.total, 0);
  
  const enrichedBreakdown = breakdown.map(item => ({
    ...item,
    percentage: totalAmount > 0 ? ((item.total / totalAmount) * 100).toFixed(2) : 0
  }));

  sendSuccess(res, 200, 'Category breakdown retrieved successfully', {
    type,
    period,
    dateRange: { startDate, endDate },
    totalAmount,
    categoryCount: breakdown.length,
    breakdown: enrichedBreakdown
  });
});

/**
 * Get monthly comparison
 */
const getMonthlyComparison = catchAsync(async (req, res, next) => {
  const { months = 6, year, month } = req.query;
  
  let startDate, endDate;

  // If specific year and month are provided, get data for that month
  if (year && month) {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Validate input
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return next(new AppError('Invalid year or month provided', 400));
    }
    
    startDate = new Date(yearNum, monthNum - 1, 1); // month is 0-based
    endDate = new Date(yearNum, monthNum, 0); // Last day of the month
    
    // Get data for the specific month
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    // Get category breakdown for the month
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startDate, $lte: endDate },
          type: 'expense',
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: '$category.name' },
          categoryColor: { $first: '$category.color' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Format the results for specific month
    const monthData = {
      year: yearNum,
      month: monthNum,
      monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
      income: 0,
      expenses: 0,
      net: 0,
      transactionCount: 0,
      avgTransactionAmount: 0,
      categoryBreakdown
    };

    monthlyData.forEach(data => {
      if (data._id.type === 'income') {
        monthData.income = data.total;
        monthData.transactionCount += data.count;
      } else if (data._id.type === 'expense') {
        monthData.expenses = data.total;
        monthData.transactionCount += data.count;
        monthData.avgTransactionAmount = data.avgAmount;
      }
    });

    monthData.net = monthData.income - monthData.expenses;

    return sendSuccess(res, 200, `Monthly data for ${monthData.monthName} ${yearNum} retrieved successfully`, {
      month: monthData,
      dateRange: { startDate, endDate }
    });
  }

  // Original logic for multiple months comparison
  const now = new Date();
  startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const monthlyData = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        date: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Format the results
  const formattedData = {};
  monthlyData.forEach(data => {
    const monthKey = `${data._id.year}-${String(data._id.month).padStart(2, '0')}`;
    
    if (!formattedData[monthKey]) {
      formattedData[monthKey] = {
        month: monthKey,
        income: 0,
        expenses: 0,
        net: 0,
        transactionCount: 0
      };
    }

    formattedData[monthKey][data._id.type === 'income' ? 'income' : 'expenses'] = data.total;
    formattedData[monthKey].transactionCount += data.count;
  });

  // Calculate net and percentage changes
  const months_array = Object.values(formattedData);
  months_array.forEach((month, index) => {
    month.net = month.income - month.expenses;
    
    if (index > 0) {
      const previousMonth = months_array[index - 1];
      month.incomeChange = previousMonth.income > 0 
        ? ((month.income - previousMonth.income) / previousMonth.income * 100).toFixed(2)
        : 0;
      month.expenseChange = previousMonth.expenses > 0 
        ? ((month.expenses - previousMonth.expenses) / previousMonth.expenses * 100).toFixed(2)
        : 0;
    }
  });

  sendSuccess(res, 200, 'Monthly comparison retrieved successfully', {
    months: parseInt(months),
    data: months_array
  });
});

/**
 * Get budget vs actual analysis
 */
const getBudgetAnalysis = catchAsync(async (req, res, next) => {
  const { period = 'month' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate, endDate = now;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Get actual spending by category
  const actualSpending = await Transaction.aggregate([
    {
      $match: {
        userId: req.user._id,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$categoryId',
        categoryName: { $first: '$category.name' },
        actual: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    }
  ]);

  // Get categories with budget information (if available in user preferences)
  const categories = await Category.find({
    userId: req.user.id,
    type: 'expense',
    isActive: true
  });

  // Create budget analysis
  const budgetAnalysis = categories.map(category => {
    const actual = actualSpending.find(
      spending => spending._id.toString() === category._id.toString()
    );

    const actualAmount = actual ? actual.actual : 0;
    const transactionCount = actual ? actual.transactions : 0;
    
    // Default budget can be set in category or user preferences
    const budget = category.monthlyBudget || 0;
    
    const analysis = {
      categoryId: category._id,
      categoryName: category.name,
      categoryColor: category.color,
      budget,
      actual: actualAmount,
      difference: budget - actualAmount,
      percentage: budget > 0 ? ((actualAmount / budget) * 100).toFixed(2) : 0,
      transactionCount,
      status: budget === 0 ? 'no-budget' : 
               actualAmount <= budget ? 'under-budget' : 'over-budget'
    };

    return analysis;
  });

  // Calculate totals
  const totals = {
    totalBudget: budgetAnalysis.reduce((sum, item) => sum + item.budget, 0),
    totalActual: budgetAnalysis.reduce((sum, item) => sum + item.actual, 0),
    totalDifference: 0,
    overallPercentage: 0
  };

  totals.totalDifference = totals.totalBudget - totals.totalActual;
  totals.overallPercentage = totals.totalBudget > 0 
    ? ((totals.totalActual / totals.totalBudget) * 100).toFixed(2)
    : 0;

  sendSuccess(res, 200, 'Budget analysis retrieved successfully', {
    period,
    dateRange: { startDate, endDate },
    totals,
    categories: budgetAnalysis.sort((a, b) => b.actual - a.actual)
  });
});

/**
 * Export analytics data
 */
const exportAnalytics = catchAsync(async (req, res, next) => {
  const { reportType = 'summary', format = 'json', period = 'month' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate, endDate = now;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let analyticsData;

  switch (reportType) {
    case 'summary':
      analyticsData = await getDashboardSummaryData(req.user._id, startDate, endDate);
      break;
    case 'trends':
      analyticsData = await getSpendingTrendsData(req.user._id, startDate, endDate);
      break;
    case 'categories':
      analyticsData = await getCategoryBreakdownData(req.user._id, startDate, endDate);
      break;
    default:
      analyticsData = await getDashboardSummaryData(req.user._id, startDate, endDate);
  }

  if (format === 'csv') {
    // Convert to CSV format based on report type
    let csvContent = '';
    
    if (reportType === 'summary') {
      csvContent = 'Type,Total,Count,Average\n';
      csvContent += `Income,${analyticsData.summary.income.total},${analyticsData.summary.income.count},${analyticsData.summary.income.average}\n`;
      csvContent += `Expenses,${analyticsData.summary.expenses.total},${analyticsData.summary.expenses.count},${analyticsData.summary.expenses.average}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_${reportType}_${period}.csv"`);
    return res.send(csvContent);
  }

  sendSuccess(res, 200, 'Analytics data exported successfully', {
    reportType,
    period,
    dateRange: { startDate, endDate },
    data: analyticsData
  });
});

// Helper functions for export
const getDashboardSummaryData = async (userId, startDate, endDate) => {
  // Implementation similar to getDashboardOverview
  // This is a simplified version - you can expand based on needs
  return {
    summary: { income: { total: 0, count: 0, average: 0 }, expenses: { total: 0, count: 0, average: 0 } }
  };
};

const getSpendingTrendsData = async (userId, startDate, endDate) => {
  // Implementation similar to getSpendingTrends
  return { trends: [] };
};

const getCategoryBreakdownData = async (userId, startDate, endDate) => {
  // Implementation similar to getCategoryBreakdown
  return { breakdown: [] };
};

module.exports = {
  getDashboardOverview,
  getSpendingTrends,
  getCategoryBreakdown,
  getMonthlyComparison,
  getBudgetAnalysis,
  exportAnalytics
};

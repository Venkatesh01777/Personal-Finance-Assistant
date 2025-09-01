const User = require('../models/User');
const Category = require('../models/Category');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { createSendToken } = require('../middleware/auth');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Register new user
 */
const register = catchAsync(async (req, res, next) => {
  const { username, email, password, firstName, lastName, dateOfBirth, phoneNumber } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [{ email }, { username }] 
  });
  if (existingUser) {
    if (existingUser.email === email) {
      return next(new AppError('User already exists with this email', 400));
    }
    if (existingUser.username === username) {
      return next(new AppError('Username is already taken', 400));
    }
  }

  // Create new user
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    phoneNumber
  });

  // Create default categories for the user
  await Category.createDefaultCategories(user._id);

  // Send token response
  createSendToken(user, 201, res, 'User registered successfully');
});

/**
 * Login user
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated', 401));
  }

  // Update login info
  await user.updateLoginInfo();

  // Send token response
  createSendToken(user, 200, res, 'Login successful');
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('transactionCount')
    .select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendSuccess(res, 200, 'Profile retrieved successfully', user);
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req, res, next) => {
  // Fields that can be updated
  const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'preferences'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    {
      new: true,
      runValidators: true
    }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendSuccess(res, 200, 'Profile updated successfully', user);
});

/**
 * Change password
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // Send token response (user will need to login again)
  createSendToken(user, 200, res, 'Password changed successfully');
});

/**
 * Deactivate account
 */
const deactivateAccount = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { isActive: false });

  sendSuccess(res, 200, 'Account deactivated successfully');
});

/**
 * Get user dashboard stats
 */
const getDashboardStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const Transaction = require('../models/Transaction');

  // Get current month stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthlyStats, totalStats, recentTransactions] = await Promise.all([
    // Monthly stats
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: startOfMonth, $lte: endOfMonth },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Total stats
    Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),

    // Recent transactions
    Transaction.find({
      userId: req.user.id,
      isActive: true
    })
    .populate('categoryId', 'name color icon')
    .sort({ date: -1 })
    .limit(5)
  ]);

  // Format the stats
  const formatStats = (stats) => {
    const result = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
    stats.forEach(stat => {
      if (stat._id === 'income') {
        result.income = stat.total;
        result.incomeCount = stat.count;
      } else if (stat._id === 'expense') {
        result.expense = stat.total;
        result.expenseCount = stat.count;
      }
    });
    return result;
  };

  const monthlyData = formatStats(monthlyStats);
  const totalData = formatStats(totalStats);

  const dashboardData = {
    monthly: {
      ...monthlyData,
      balance: monthlyData.income - monthlyData.expense,
      totalTransactions: monthlyData.incomeCount + monthlyData.expenseCount
    },
    allTime: {
      ...totalData,
      balance: totalData.income - totalData.expense,
      totalTransactions: totalData.incomeCount + totalData.expenseCount
    },
    recentTransactions
  };

  sendSuccess(res, 200, 'Dashboard stats retrieved successfully', dashboardData);
});

/**
 * Logout user (client-side token removal)
 */
const logout = catchAsync(async (req, res, next) => {
  // Clear the cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  sendSuccess(res, 200, 'Logged out successfully');
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  getDashboardStats,
  logout
};

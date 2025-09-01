const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccess, sendPaginated, calculatePagination } = require('../utils/apiResponse');

/**
 * Get all categories for the user
 */
const getCategories = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = calculatePagination(req.query.page, req.query.limit);
  const { type, includeTransactionCounts } = req.query;

  const filter = {
    userId: req.user.id,
    isActive: true
  };

  // Filter by type if provided
  if (type && ['income', 'expense'].includes(type)) {
    filter.type = type;
  }

  let query = Category.find(filter).sort({ name: 1 });

  // Add pagination if requested
  if (req.query.page) {
    query = query.skip(skip).limit(limit);
  }

  const categories = await query;

  // Include transaction counts if requested
  if (includeTransactionCounts === 'true') {
    for (let category of categories) {
      const transactionCount = await Transaction.countDocuments({
        categoryId: category._id,
        userId: req.user.id,
        isActive: true
      });
      category.transactionCount = transactionCount;
    }
  }

  if (req.query.page) {
    const total = await Category.countDocuments(filter);
    sendPaginated(res, categories, page, limit, total, 'Categories retrieved successfully');
  } else {
    sendSuccess(res, 200, 'Categories retrieved successfully', categories);
  }
});

/**
 * Get single category by ID
 */
const getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Get transaction count for this category
  const transactionCount = await Transaction.countDocuments({
    categoryId: category._id,
    userId: req.user.id,
    isActive: true
  });

  const categoryData = {
    ...category.toObject(),
    transactionCount
  };

  sendSuccess(res, 200, 'Category retrieved successfully', categoryData);
});

/**
 * Create new category
 */
const createCategory = catchAsync(async (req, res, next) => {
  const categoryData = {
    ...req.body,
    userId: req.user.id
  };

  // Check if category name already exists for this user
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') },
    type: categoryData.type,
    userId: req.user.id,
    isActive: true
  });

  if (existingCategory) {
    return next(new AppError(`Category '${categoryData.name}' already exists for ${categoryData.type}`, 400));
  }

  const category = await Category.create(categoryData);

  sendSuccess(res, 201, 'Category created successfully', category);
});

/**
 * Update category
 */
const updateCategory = catchAsync(async (req, res, next) => {
  const { name, type } = req.body;

  // If updating name or type, check for duplicates
  if (name || type) {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    const checkName = name || category.name;
    const checkType = type || category.type;

    const existingCategory = await Category.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${checkName}$`, 'i') },
      type: checkType,
      userId: req.user.id,
      isActive: true
    });

    if (existingCategory) {
      return next(new AppError(`Category '${checkName}' already exists for ${checkType}`, 400));
    }
  }

  const category = await Category.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    },
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  sendSuccess(res, 200, 'Category updated successfully', category);
});

/**
 * Delete category (with transaction handling)
 */
const deleteCategory = catchAsync(async (req, res, next) => {
  const { action = 'reassign', newCategoryId } = req.body;

  // Find the category to delete
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Check if category has transactions
  const transactionCount = await Transaction.countDocuments({
    categoryId: category._id,
    userId: req.user.id,
    isActive: true
  });

  if (transactionCount > 0) {
    if (action === 'reassign') {
      // Reassign transactions to new category
      if (!newCategoryId) {
        return next(new AppError('New category ID is required when reassigning transactions', 400));
      }

      // Verify new category exists and belongs to user
      const newCategory = await Category.findOne({
        _id: newCategoryId,
        userId: req.user.id,
        isActive: true,
        type: category.type // Must be same type
      });

      if (!newCategory) {
        return next(new AppError('Invalid new category', 400));
      }

      // Update all transactions to new category
      await Transaction.updateMany(
        {
          categoryId: category._id,
          userId: req.user.id,
          isActive: true
        },
        { categoryId: newCategoryId }
      );

    } else if (action === 'delete') {
      // Soft delete all transactions in this category
      await Transaction.updateMany(
        {
          categoryId: category._id,
          userId: req.user.id,
          isActive: true
        },
        { isActive: false }
      );
    } else {
      return next(new AppError('Invalid action. Use "reassign" or "delete"', 400));
    }
  }

  // Soft delete the category
  category.isActive = false;
  await category.save();

  sendSuccess(res, 200, 'Category deleted successfully', {
    deletedCategory: category.name,
    transactionsAffected: transactionCount,
    action
  });
});

/**
 * Get category statistics
 */
const getCategoryStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    userId: req.user._id,
    isActive: true
  };

  if (startDate && endDate) {
    matchStage.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await Transaction.aggregate([
    { $match: matchStage },
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
        _id: {
          categoryId: '$categoryId',
          categoryName: '$category.name',
          categoryType: '$category.type',
          categoryColor: '$category.color',
          categoryIcon: '$category.icon'
        },
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        minAmount: { $min: '$amount' },
        maxAmount: { $max: '$amount' }
      }
    },
    {
      $project: {
        _id: 0,
        categoryId: '$_id.categoryId',
        categoryName: '$_id.categoryName',
        categoryType: '$_id.categoryType',
        categoryColor: '$_id.categoryColor',
        categoryIcon: '$_id.categoryIcon',
        totalAmount: 1,
        transactionCount: 1,
        avgAmount: { $round: ['$avgAmount', 2] },
        minAmount: 1,
        maxAmount: 1
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  // Calculate percentages
  const totalExpenses = stats
    .filter(stat => stat.categoryType === 'expense')
    .reduce((sum, stat) => sum + stat.totalAmount, 0);

  const totalIncome = stats
    .filter(stat => stat.categoryType === 'income')
    .reduce((sum, stat) => sum + stat.totalAmount, 0);

  const enrichedStats = stats.map(stat => ({
    ...stat,
    percentage: stat.categoryType === 'expense' 
      ? totalExpenses > 0 ? ((stat.totalAmount / totalExpenses) * 100).toFixed(2) : 0
      : totalIncome > 0 ? ((stat.totalAmount / totalIncome) * 100).toFixed(2) : 0
  }));

  const summary = {
    totalCategories: stats.length,
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown: enrichedStats
  };

  sendSuccess(res, 200, 'Category statistics retrieved successfully', summary);
});

/**
 * Get popular categories (most used)
 */
const getPopularCategories = catchAsync(async (req, res, next) => {
  const { limit = 5, type } = req.query;

  const matchStage = {
    userId: req.user._id,
    isActive: true
  };

  // Add date filter for last 30 days by default
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  matchStage.date = { $gte: thirtyDaysAgo };

  const pipeline = [
    { $match: matchStage },
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
        categoryType: { $first: '$category.type' },
        categoryColor: { $first: '$category.color' },
        categoryIcon: { $first: '$category.icon' },
        usageCount: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ];

  // Filter by type if provided
  if (type && ['income', 'expense'].includes(type)) {
    pipeline.push({ $match: { categoryType: type } });
  }

  pipeline.push(
    { $sort: { usageCount: -1 } },
    { $limit: parseInt(limit) }
  );

  const popularCategories = await Transaction.aggregate(pipeline);

  sendSuccess(res, 200, 'Popular categories retrieved successfully', popularCategories);
});

/**
 * Reset categories to default
 */
const resetToDefaultCategories = catchAsync(async (req, res, next) => {
  const { confirmReset } = req.body;

  if (confirmReset !== true) {
    return next(new AppError('Please confirm reset by setting confirmReset to true', 400));
  }

  // Soft delete all existing custom categories
  await Category.updateMany(
    {
      userId: req.user.id,
      isDefault: false,
      isActive: true
    },
    { isActive: false }
  );

  // Get user's existing default categories
  const existingDefaults = await Category.find({
    userId: req.user.id,
    isDefault: true,
    isActive: true
  });

  const defaultCategories = require('../models/Category').getDefaultCategories();
  const categoriesToCreate = [];

  // Check which default categories are missing
  for (const defaultCat of defaultCategories) {
    const exists = existingDefaults.find(
      cat => cat.name === defaultCat.name && cat.type === defaultCat.type
    );

    if (!exists) {
      categoriesToCreate.push({
        ...defaultCat,
        userId: req.user.id,
        isDefault: true
      });
    }
  }

  // Create missing default categories
  let createdCategories = [];
  if (categoriesToCreate.length > 0) {
    createdCategories = await Category.insertMany(categoriesToCreate);
  }

  const allDefaultCategories = await Category.find({
    userId: req.user.id,
    isDefault: true,
    isActive: true
  }).sort({ type: 1, name: 1 });

  sendSuccess(res, 200, 'Categories reset to default successfully', {
    totalCategories: allDefaultCategories.length,
    createdCategories: createdCategories.length,
    categories: allDefaultCategories
  });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getPopularCategories,
  resetToDefaultCategories
};

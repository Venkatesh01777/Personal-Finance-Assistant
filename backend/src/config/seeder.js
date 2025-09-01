const User = require('../models/User');
const Category = require('../models/Category');
const logger = require('../utils/logger');

/**
 * Seed default categories for a user
 */
const seedDefaultCategories = async (userId) => {
  try {
    const defaultCategories = [
      // Income Categories
      { name: 'Salary', type: 'income', color: '#4CAF50', icon: '💼', userId, isDefault: true },
      { name: 'Freelance', type: 'income', color: '#2196F3', icon: '💻', userId, isDefault: true },
      { name: 'Investment', type: 'income', color: '#FF9800', icon: '📈', userId, isDefault: true },
      { name: 'Other Income', type: 'income', color: '#9C27B0', icon: '💰', userId, isDefault: true },

      // Expense Categories
      { name: 'Food & Dining', type: 'expense', color: '#F44336', icon: '🍽️', userId, isDefault: true },
      { name: 'Transportation', type: 'expense', color: '#3F51B5', icon: '🚗', userId, isDefault: true },
      { name: 'Shopping', type: 'expense', color: '#E91E63', icon: '🛍️', userId, isDefault: true },
      { name: 'Entertainment', type: 'expense', color: '#9C27B0', icon: '🎬', userId, isDefault: true },
      { name: 'Bills & Utilities', type: 'expense', color: '#607D8B', icon: '💡', userId, isDefault: true },
      { name: 'Healthcare', type: 'expense', color: '#4CAF50', icon: '🏥', userId, isDefault: true },
      { name: 'Education', type: 'expense', color: '#FF9800', icon: '📚', userId, isDefault: true },
      { name: 'Travel', type: 'expense', color: '#00BCD4', icon: '✈️', userId, isDefault: true },
      { name: 'Insurance', type: 'expense', color: '#795548', icon: '🛡️', userId, isDefault: true },
      { name: 'Other Expenses', type: 'expense', color: '#9E9E9E', icon: '💸', userId, isDefault: true }
    ];

    // Check if categories already exist
    const existingCategories = await Category.find({ userId, isDefault: true });
    
    if (existingCategories.length === 0) {
      await Category.insertMany(defaultCategories);
      logger.info(`Seeded ${defaultCategories.length} default categories for user ${userId}`);
    }

    return defaultCategories.length;
  } catch (error) {
    logger.error('Error seeding default categories:', error);
    return 0;
  }
};

/**
 * Get database statistics
 */
const getDatabaseStats = async () => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      require('../models/Transaction').countDocuments(),
      require('../models/Receipt').countDocuments()
    ]);

    return {
      users: stats[0],
      categories: stats[1],
      transactions: stats[2],
      receipts: stats[3],
      total: stats.reduce((sum, count) => sum + count, 0)
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return {
      users: 0,
      categories: 0,
      transactions: 0,
      receipts: 0,
      total: 0
    };
  }
};

module.exports = {
  seedDefaultCategories,
  getDatabaseStats
};

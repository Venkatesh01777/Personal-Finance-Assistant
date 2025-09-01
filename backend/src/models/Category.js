const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [30, 'Category name cannot be more than 30 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  icon: {
    type: String,
    default: 'folder',
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense', 'both'],
    default: 'expense'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ userId: 1, name: 1 }, { unique: true });
categorySchema.index({ userId: 1, type: 1 });
categorySchema.index({ userId: 1, isActive: 1 });

// Virtual for transaction count in this category
categorySchema.virtual('transactionCount', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

// Virtual for total amount in this category
categorySchema.virtual('totalAmount', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'categoryId',
  match: { isActive: true }
});

// Ensure user can't create duplicate category names
categorySchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('name')) {
    const existingCategory = await this.constructor.findOne({
      userId: this.userId,
      name: { $regex: new RegExp(`^${this.name}$`, 'i') },
      _id: { $ne: this._id },
      isActive: true
    });
    
    if (existingCategory) {
      const error = new Error('Category name already exists for this user');
      error.statusCode = 400;
      return next(error);
    }
  }
  next();
});

// Static method to get default categories
categorySchema.statics.getDefaultCategories = function() {
  return [
    // Expense categories
    { name: 'Food & Dining', type: 'expense', color: '#EF4444', icon: 'utensils' },
    { name: 'Transportation', type: 'expense', color: '#3B82F6', icon: 'car' },
    { name: 'Shopping', type: 'expense', color: '#8B5CF6', icon: 'shopping-bag' },
    { name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film' },
    { name: 'Bills & Utilities', type: 'expense', color: '#F59E0B', icon: 'receipt' },
    { name: 'Healthcare', type: 'expense', color: '#10B981', icon: 'heart' },
    { name: 'Education', type: 'expense', color: '#6366F1', icon: 'book' },
    { name: 'Travel', type: 'expense', color: '#14B8A6', icon: 'plane' },
    { name: 'Groceries', type: 'expense', color: '#84CC16', icon: 'shopping-cart' },
    { name: 'Other', type: 'expense', color: '#6B7280', icon: 'folder' },
    
    // Income categories
    { name: 'Salary', type: 'income', color: '#059669', icon: 'briefcase' },
    { name: 'Freelance', type: 'income', color: '#7C3AED', icon: 'laptop' },
    { name: 'Investment', type: 'income', color: '#DC2626', icon: 'trending-up' },
    { name: 'Gift', type: 'income', color: '#DB2777', icon: 'gift' },
    { name: 'Other Income', type: 'income', color: '#6B7280', icon: 'dollar-sign' }
  ];
};

// Static method to create default categories for a user
categorySchema.statics.createDefaultCategories = async function(userId) {
  const defaultCategories = this.getDefaultCategories();
  const categories = defaultCategories.map(cat => ({
    ...cat,
    userId,
    isDefault: true
  }));
  
  return await this.insertMany(categories);
};

module.exports = mongoose.model('Category', categorySchema);

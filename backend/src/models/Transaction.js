const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense'],
    lowercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    max: [1000000, 'Amount cannot exceed 1,000,000']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'],
    default: 'cash'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot be more than 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot be more than 20 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt',
    default: null
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    endDate: {
      type: Date
    },
    nextDueDate: {
      type: Date
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    source: {
      type: String,
      enum: ['manual', 'receipt', 'import', 'recurring'],
      default: 'manual'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, isActive: 1, date: -1 });
transactionSchema.index({ receiptId: 1 });
transactionSchema.index({ 'recurringDetails.nextDueDate': 1, isRecurring: true });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Virtual for month-year grouping
transactionSchema.virtual('monthYear').get(function() {
  return `${this.date.getFullYear()}-${String(this.date.getMonth() + 1).padStart(2, '0')}`;
});

// Pre-save middleware
transactionSchema.pre('save', async function(next) {
  // Validate recurring details if transaction is recurring
  if (this.isRecurring) {
    const requiredFields = ['frequency', 'interval', 'endDate'];
    const missingFields = requiredFields.filter(field => 
      !this.recurringDetails || !this.recurringDetails[field]
    );
    
    if (missingFields.length > 0) {
      const error = new Error(`Missing required recurring details: ${missingFields.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }
    
    // Set next due date for recurring transactions
    if (this.isNew) {
      this.recurringDetails.nextDueDate = this.calculateNextDueDate();
    }
  } else {
    // Clear recurring details if transaction is not recurring
    this.recurringDetails = undefined;
  }

  // Validate category exists and belongs to user
  if (this.isNew || this.isModified('categoryId')) {
    const Category = mongoose.model('Category');
    const category = await Category.findOne({
      _id: this.categoryId,
      userId: this.userId,
      isActive: true
    });
    
    if (!category) {
      const error = new Error('Invalid category for this user');
      error.statusCode = 400;
      return next(error);
    }
    
    // Validate transaction type matches category type
    if (category.type !== 'both' && category.type !== this.type) {
      const error = new Error(`Category '${category.name}' is not valid for ${this.type} transactions`);
      error.statusCode = 400;
      return next(error);
    }
  }
  
  next();
});

// Instance method to calculate next due date for recurring transactions
transactionSchema.methods.calculateNextDueDate = function() {
  if (!this.isRecurring) return null;
  
  const { frequency, interval } = this.recurringDetails;
  const currentDate = new Date(this.date);
  
  switch (frequency) {
    case 'daily':
      currentDate.setDate(currentDate.getDate() + interval);
      break;
    case 'weekly':
      currentDate.setDate(currentDate.getDate() + (interval * 7));
      break;
    case 'monthly':
      currentDate.setMonth(currentDate.getMonth() + interval);
      break;
    case 'yearly':
      currentDate.setFullYear(currentDate.getFullYear() + interval);
      break;
    default:
      return null;
  }
  
  return currentDate;
};

// Static method to get transactions by date range
transactionSchema.statics.getByDateRange = function(userId, startDate, endDate, options = {}) {
  const query = {
    userId,
    isActive: true,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (options.type) query.type = options.type;
  if (options.categoryId) query.categoryId = options.categoryId;
  
  return this.find(query)
    .populate('categoryId', 'name color icon type')
    .populate('receiptId', 'filename originalName')
    .sort({ date: -1 });
};

// Static method to get spending by category
transactionSchema.statics.getSpendingByCategory = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        isActive: true,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
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
    {
      $unwind: '$category'
    },
    {
      $group: {
        _id: '$categoryId',
        name: { $first: '$category.name' },
        color: { $first: '$category.color' },
        icon: { $first: '$category.icon' },
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Static method to get monthly spending trends
transactionSchema.statics.getMonthlyTrends = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type'
        },
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);

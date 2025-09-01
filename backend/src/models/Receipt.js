const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  mimetype: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0'],
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'failed'],
    default: 'uploaded'
  },
  
  // OCR Results
  ocrResults: {
    extractedText: {
      type: String,
      default: ''
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    processedAt: {
      type: Date,
      default: null
    },
    processingTime: {
      type: Number, // in milliseconds
      default: 0
    }
  },
  
  // Parsed Data from OCR
  parsedData: {
    merchantName: {
      value: String,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    },
    totalAmount: {
      value: Number,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    },
    date: {
      value: Date,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    },
    items: [{
      name: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    }],
    taxAmount: {
      value: Number,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    },
    category: {
      suggested: String,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    },
    paymentMethod: {
      value: String,
      confidence: { type: Number, min: 0, max: 1, default: 0 }
    }
  },
  
  // Manual Corrections
  corrections: {
    merchantName: String,
    totalAmount: Number,
    date: Date,
    category: String,
    notes: String
  },
  
  // Associated Transaction
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  
  // Processing metadata
  processingAttempts: {
    type: Number,
    default: 0,
    max: 3
  },
  lastProcessingError: {
    message: String,
    timestamp: Date
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
receiptSchema.index({ userId: 1, createdAt: -1 });
receiptSchema.index({ userId: 1, status: 1 });
receiptSchema.index({ transactionId: 1 });
receiptSchema.index({ 'parsedData.date.value': 1, userId: 1 });

// Virtual for file URL
receiptSchema.virtual('fileUrl').get(function() {
  if (this.filePath) {
    return `${process.env.API_BASE_URL}/${this.filePath.replace(/\\/g, '/')}`;
  }
  return null;
});

// Virtual for overall parsing confidence
receiptSchema.virtual('overallConfidence').get(function() {
  const { parsedData } = this;
  if (!parsedData) return 0;
  
  const confidenceValues = [
    parsedData.merchantName?.confidence || 0,
    parsedData.totalAmount?.confidence || 0,
    parsedData.date?.confidence || 0,
    parsedData.category?.confidence || 0
  ].filter(val => val > 0);
  
  return confidenceValues.length > 0 
    ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length 
    : 0;
});

// Virtual for suggested transaction
receiptSchema.virtual('suggestedTransaction').get(function() {
  const { parsedData, corrections } = this;
  
  return {
    type: 'expense',
    amount: corrections.totalAmount || parsedData.totalAmount?.value || 0,
    description: corrections.merchantName || parsedData.merchantName?.value || 'Receipt Transaction',
    date: corrections.date || parsedData.date?.value || new Date(),
    category: corrections.category || parsedData.category?.suggested || 'Other',
    paymentMethod: parsedData.paymentMethod?.value || 'other',
    notes: corrections.notes || `Imported from receipt: ${this.originalName}`,
    receiptId: this._id
  };
});

// Pre-save middleware
receiptSchema.pre('save', function(next) {
  // Update status based on processing results
  if (this.isModified('ocrResults.extractedText') && this.ocrResults.extractedText) {
    this.status = 'processed';
    this.ocrResults.processedAt = new Date();
  }
  
  next();
});

// Instance method to mark as failed
receiptSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.processingAttempts += 1;
  this.lastProcessingError = {
    message: error.message || 'Unknown error',
    timestamp: new Date()
  };
  return this.save();
};

// Instance method to update parsed data
receiptSchema.methods.updateParsedData = function(data) {
  this.parsedData = { ...this.parsedData, ...data };
  this.status = 'processed';
  this.ocrResults.processedAt = new Date();
  return this.save();
};

// Static method to get receipts needing processing
receiptSchema.statics.getNeedingProcessing = function() {
  return this.find({
    status: { $in: ['uploaded', 'processing'] },
    processingAttempts: { $lt: 3 },
    isActive: true
  }).sort({ createdAt: 1 });
};

// Static method to get user's recent receipts
receiptSchema.statics.getUserReceipts = function(userId, limit = 20, offset = 0) {
  return this.find({ 
    userId, 
    isActive: true 
  })
  .populate('transactionId', 'amount description date type')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(offset);
};

// Static method to get receipts by date range
receiptSchema.statics.getByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    isActive: true,
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  })
  .populate('transactionId', 'amount description date type')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Receipt', receiptSchema);

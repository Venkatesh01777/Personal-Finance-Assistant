const Receipt = require('../models/Receipt');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const ocrService = require('../services/ocrService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccess, sendPaginated, calculatePagination } = require('../utils/apiResponse');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'receipts');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Only image files and PDFs are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Upload and process receipt
 */
const uploadReceipt = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a receipt file', 400));
  }

  const { description, notes } = req.body;

  // Create receipt record with correct field names
  const receipt = await Receipt.create({
    userId: req.user.id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype, // Correct field name
    size: req.file.size,
    filePath: req.file.path, // Use the actual file path
    status: 'uploaded',
    ...(description || notes ? {
      corrections: {
        ...(description && { notes: description }),
        ...(notes && { notes })
      }
    } : {})
  });

  // Process OCR in background
  processReceiptOCR(receipt._id).catch(error => {
    console.error('OCR processing failed:', error);
  });

  sendSuccess(res, 201, 'Receipt uploaded successfully', receipt);
});

/**
 * Background OCR processing
 */
const processReceiptOCR = async (receiptId) => {
  try {
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) return;

    // Update status to processing
    receipt.status = 'processing';
    await receipt.save();

    // Process OCR using the correct method name
    const ocrResult = await ocrService.processReceipt(receipt.filePath);

    if (ocrResult.success) {
      // Update receipt with OCR results
      receipt.ocrResults = {
        extractedText: ocrResult.extractedText,
        confidence: ocrResult.confidence,
        processedAt: new Date(),
        processingTime: ocrResult.processingTime
      };
      receipt.parsedData = ocrResult.parsedData;
      receipt.status = 'processed';
    } else {
      // Mark as failed with error details
      receipt.status = 'failed';
      receipt.lastProcessingError = {
        message: ocrResult.error || 'OCR processing failed',
        timestamp: new Date()
      };
      receipt.processingAttempts += 1;
    }

    await receipt.save();

  } catch (error) {
    console.error('OCR processing error:', error);
    try {
      await Receipt.findByIdAndUpdate(receiptId, {
        status: 'failed',
        lastProcessingError: {
          message: error.message,
          timestamp: new Date()
        },
        processingAttempts: { $inc: 1 }
      });
    } catch (updateError) {
      console.error('Failed to update receipt status:', updateError);
    }
  }
};

/**
 * Get all receipts
 */
const getReceipts = catchAsync(async (req, res, next) => {
  const { page, limit, skip } = calculatePagination(req.query.page, req.query.limit);
  const { status, startDate, endDate } = req.query;

  const filter = {
    userId: req.user.id,
    isActive: true
  };

  if (status) {
    filter.status = status;
  }

  if (startDate && endDate) {
    filter.uploadedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const [receipts, total] = await Promise.all([
    Receipt.find(filter)
      .populate('transactionId', 'description amount date')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit),
    Receipt.countDocuments(filter)
  ]);

  sendPaginated(res, receipts, page, limit, total, 'Receipts retrieved successfully');
});

/**
 * Get single receipt
 */
const getReceipt = catchAsync(async (req, res, next) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  }).populate('transactionId', 'description amount date categoryId');

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  sendSuccess(res, 200, 'Receipt retrieved successfully', receipt);
});

/**
 * Update receipt
 */
const updateReceipt = catchAsync(async (req, res, next) => {
  const allowedUpdates = ['description', 'notes', 'parsedData'];
  const updates = {};

  // Filter allowed updates
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const receipt = await Receipt.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id,
      isActive: true
    },
    updates,
    {
      new: true,
      runValidators: true
    }
  );

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  sendSuccess(res, 200, 'Receipt updated successfully', receipt);
});

/**
 * Delete receipt
 */
const deleteReceipt = catchAsync(async (req, res, next) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  // Check if receipt is linked to a transaction
  if (receipt.transactionId) {
    return next(new AppError('Cannot delete receipt that is linked to a transaction. Unlink first.', 400));
  }

  // Soft delete the receipt
  receipt.isActive = false;
  await receipt.save();

  // Delete the physical file
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'receipts', receipt.filename);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Failed to delete file:', error);
    // Continue even if file deletion fails
  }

  sendSuccess(res, 200, 'Receipt deleted successfully');
});

/**
 * Reprocess receipt OCR
 */
const reprocessReceipt = catchAsync(async (req, res, next) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  // Reset OCR data to match the current model structure
  receipt.ocrResults = {
    extractedText: '',
    confidence: 0,
    processedAt: null,
    processingTime: 0
  };
  receipt.parsedData = {
    merchantName: { value: '', confidence: 0 },
    totalAmount: { value: 0, confidence: 0 },
    date: { value: new Date(), confidence: 0 },
    items: [],
    taxAmount: { value: 0, confidence: 0 },
    category: { suggested: 'other', confidence: 0 },
    paymentMethod: { value: 'other', confidence: 0 }
  };
  receipt.status = 'uploaded';
  receipt.processingAttempts = 0;
  receipt.lastProcessingError = undefined;

  await receipt.save();

  // Process OCR in background
  processReceiptOCR(receipt._id).catch(error => {
    console.error('OCR reprocessing failed:', error);
  });

  sendSuccess(res, 200, 'Receipt queued for reprocessing', receipt);
});

/**
 * Create transaction from receipt
 */
const createTransactionFromReceipt = catchAsync(async (req, res, next) => {
  const { categoryId, customData } = req.body;

  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  if (receipt.transactionId) {
    return next(new AppError('Receipt is already linked to a transaction', 400));
  }

  if (receipt.status !== 'processed') {
    return next(new AppError('Receipt must be processed before creating transaction', 400));
  }

  // Validate category
  let category;
  if (categoryId) {
    category = await Category.findOne({
      _id: categoryId,
      userId: req.user.id,
      isActive: true
    });

    if (!category) {
      return next(new AppError('Invalid category', 400));
    }
  } else {
    // Try to find suggested category
    if (receipt.suggestedCategories && receipt.suggestedCategories.length > 0) {
      category = await Category.findOne({
        _id: receipt.suggestedCategories[0],
        userId: req.user.id,
        isActive: true
      });
    }

    if (!category) {
      // Default to first expense category
      category = await Category.findOne({
        userId: req.user.id,
        type: 'expense',
        isActive: true
      });
    }
  }

  if (!category) {
    return next(new AppError('No suitable category found', 400));
  }

  // Prepare transaction data
  const transactionData = {
    userId: req.user.id,
    type: 'expense', // Receipts are typically for expenses
    amount: customData?.amount || receipt.parsedData.totalAmount || 0,
    description: customData?.description || receipt.parsedData.merchant || 'Receipt Transaction',
    categoryId: category._id,
    date: customData?.date || receipt.parsedData.date || new Date(),
    location: receipt.parsedData.merchant || '',
    notes: customData?.notes || `Created from receipt: ${receipt.originalName}`,
    receiptId: receipt._id
  };

  // Add items if available
  if (receipt.parsedData.items && receipt.parsedData.items.length > 0) {
    transactionData.notes += '\n\nItems:\n' + 
      receipt.parsedData.items.map(item => `- ${item.description}: $${item.amount}`).join('\n');
  }

  // Create transaction
  const transaction = await Transaction.create(transactionData);

  // Link receipt to transaction
  receipt.transactionId = transaction._id;
  await receipt.save();

  // Populate response
  await transaction.populate('categoryId', 'name color icon type');

  // Transform transaction to have proper category mapping
  const transformedTransaction = transformTransaction(transaction);

  sendSuccess(res, 201, 'Transaction created from receipt successfully', {
    transaction: transformedTransaction,
    receipt
  });
});

/**
 * Unlink receipt from transaction
 */
const unlinkReceiptFromTransaction = catchAsync(async (req, res, next) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  if (!receipt.transactionId) {
    return next(new AppError('Receipt is not linked to any transaction', 400));
  }

  // Remove link
  const transactionId = receipt.transactionId;
  receipt.transactionId = null;
  await receipt.save();

  // Update transaction to remove receipt reference
  await Transaction.findByIdAndUpdate(transactionId, {
    receiptId: null
  });

  sendSuccess(res, 200, 'Receipt unlinked from transaction successfully');
});

/**
 * Get receipt statistics
 */
const getReceiptStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const matchStage = {
    userId: req.user._id,
    isActive: true
  };

  if (startDate && endDate) {
    matchStage.uploadedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const stats = await Receipt.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalReceipts = await Receipt.countDocuments(matchStage);
  const linkedReceipts = await Receipt.countDocuments({
    ...matchStage,
    transactionId: { $ne: null }
  });

  const formattedStats = {
    total: totalReceipts,
    linked: linkedReceipts,
    unlinked: totalReceipts - linkedReceipts,
    byStatus: {}
  };

  // Format status breakdown
  stats.forEach(stat => {
    formattedStats.byStatus[stat._id] = stat.count;
  });

  // Ensure all statuses are represented
  ['uploaded', 'processing', 'processed', 'failed'].forEach(status => {
    if (!formattedStats.byStatus[status]) {
      formattedStats.byStatus[status] = 0;
    }
  });

  sendSuccess(res, 200, 'Receipt statistics retrieved successfully', formattedStats);
});

module.exports = {
  upload: upload.single('receipt'),
  uploadReceipt,
  getReceipts,
  getReceipt,
  updateReceipt,
  deleteReceipt,
  reprocessReceipt,
  createTransactionFromReceipt,
  unlinkReceiptFromTransaction,
  getReceiptStats
};

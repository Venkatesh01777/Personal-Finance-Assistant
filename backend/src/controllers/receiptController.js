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
const fsSync = require('fs');

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
 * Create transactions from receipt OCR data
 * @param {String} userId - User ID
 * @param {String} receiptId - Receipt ID
 * @param {Object} parsedData - Parsed OCR data
 * @returns {Array} - Created transactions
 */
const createTransactionsFromReceipt = async (userId, receiptId, parsedData) => {
  try {
    const createdTransactions = [];
    
    // Get user's categories for mapping
    const userCategories = await Category.find({ userId, isActive: true });
    const categoryMap = {};
    userCategories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    // Helper function to find category ID by name or create default
    const findCategoryId = async (categoryName, transactionType = 'expense') => {
      const normalizedName = categoryName?.toLowerCase();
      
      // Try to find existing category
      if (normalizedName && categoryMap[normalizedName]) {
        return categoryMap[normalizedName];
      }
      
      // Map common category names to existing ones
      const categoryMappings = {
        'food_dining': 'food & dining',
        'groceries': 'groceries',
        'transportation': 'transportation',
        'shopping': 'shopping',
        'healthcare': 'healthcare',
        'entertainment': 'entertainment',
        'utilities': 'utilities',
        'bills': 'bills & utilities',
        'salary': 'salary',
        'freelance': 'freelance',
        'investment': 'investment'
      };
      
      const mappedName = categoryMappings[normalizedName];
      if (mappedName && categoryMap[mappedName]) {
        return categoryMap[mappedName];
      }
      
      // Find or create appropriate "Other" category based on transaction type
      const otherCategoryName = transactionType === 'income' ? 'Other Income' : 'Other Expenses';
      let otherCategory = userCategories.find(cat => 
        cat.name.toLowerCase() === otherCategoryName.toLowerCase() ||
        (transactionType === 'expense' && cat.name.toLowerCase() === 'other')
      );
      
      if (!otherCategory) {
        otherCategory = await Category.create({
          name: otherCategoryName,
          description: `Auto-created category for uncategorized ${transactionType === 'income' ? 'income' : 'expenses'}`,
          color: transactionType === 'income' ? '#9C27B0' : '#6B7280',
          icon: transactionType === 'income' ? '💰' : 'folder',
          type: transactionType,
          userId: userId,
          isDefault: false
        });
      }
      
      return otherCategory._id;
    };

    // Check if we have transactions array in the new format
    if (parsedData.transactions && Array.isArray(parsedData.transactions) && parsedData.transactions.length > 0) {
      // Multiple transactions from bank statements, CSV files, etc.
      for (const transactionData of parsedData.transactions) {
        if (transactionData.amount > 0) { // Only create transactions with valid amounts
          const transactionType = transactionData.type || 'expense';
          const categoryId = await findCategoryId(transactionData.category, transactionType);
          
          const transaction = await Transaction.create({
            userId,
            categoryId,
            type: transactionType,
            amount: transactionData.amount,
            description: transactionData.description || `${parsedData.merchantName?.value || 'Receipt'} Transaction`,
            date: transactionData.date ? new Date(transactionData.date) : (parsedData.documentDate?.value ? new Date(parsedData.documentDate.value) : new Date()),
            paymentMethod: transactionData.paymentMethod || 'other',
            location: transactionData.location || parsedData.merchantName?.value || '',
            notes: transactionData.notes || `Auto-created from receipt: ${receiptId}`,
            receiptId: receiptId,
            createdBy: {
              source: 'receipt',
              confidence: transactionData.confidence || 0.8
            }
          });
          
          await transaction.populate('categoryId', 'name color icon type');
          createdTransactions.push(transformTransaction(transaction));
        }
      }
    } else {
      // Single transaction from receipt
      const totalAmount = parsedData.totals?.totalAmount?.value || parsedData.totalAmount?.value;
      
      if (totalAmount && totalAmount > 0) {
        // Determine category from legacy or new format
        let categoryName = parsedData.category?.suggested;
        if (!categoryName && parsedData.transactions?.[0]?.category) {
          categoryName = parsedData.transactions[0].category;
        }
        
        const categoryId = await findCategoryId(categoryName, 'expense');
        
        // Create description from merchant name or use default
        const merchantName = parsedData.merchantName?.value || 'Unknown Merchant';
        const description = `${merchantName} - Receipt`;
        
        const transaction = await Transaction.create({
          userId,
          categoryId,
          type: 'expense', // Default to expense for receipts
          amount: totalAmount,
          description,
          date: parsedData.documentDate?.value ? new Date(parsedData.documentDate.value) : (parsedData.date?.value ? new Date(parsedData.date.value) : new Date()),
          paymentMethod: parsedData.paymentInfo?.method || parsedData.paymentMethod?.value || 'other',
          location: merchantName,
          notes: `Auto-created from receipt: ${receiptId}`,
          receiptId: receiptId,
          createdBy: {
            source: 'receipt',
            confidence: parsedData.confidence || 0.8
          }
        });
        
        await transaction.populate('categoryId', 'name color icon type');
        createdTransactions.push(transformTransaction(transaction));
      }
    }
    
    return createdTransactions;
  } catch (error) {
    console.error('Error creating transactions from receipt:', error);
    throw error;
  }
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
  // Accept images, PDFs, CSV, and Excel files
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'text/plain', // Some browsers detect CSV as text/plain
    'application/csv',
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ];

  if (file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files, PDFs, CSV, and Excel files are allowed', 400), false);
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
  // Store relative path instead of absolute path
  const relativePath = path.join('uploads', 'receipts', req.file.filename);
  
  const receipt = await Receipt.create({
    userId: req.user.id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype, // Correct field name
    size: req.file.size,
    filePath: relativePath, // Store relative path for URL generation
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

    // Convert relative path to absolute path for processing
    const absolutePath = path.join(process.cwd(), receipt.filePath);
    console.log('Processing file:', absolutePath, 'Type:', receipt.mimetype);

    // Check if file is CSV or Excel - handle differently
    const isDataFile = receipt.mimetype.includes('csv') || 
                      receipt.mimetype.includes('excel') || 
                      receipt.mimetype.includes('spreadsheet') ||
                      receipt.originalName.toLowerCase().endsWith('.csv') ||
                      receipt.originalName.toLowerCase().endsWith('.xls') ||
                      receipt.originalName.toLowerCase().endsWith('.xlsx');

    if (isDataFile) {
      // For CSV/Excel files, parse the data and create transactions
      try {
        const fileImportService = require('../services/fileImportService');
        const service = new fileImportService();
        
        if (service.isSupported(absolutePath)) {
          const importResult = await service.processFile(absolutePath);
          
          if (importResult.success && importResult.data.length > 0) {
            // Convert imported data to transaction format
            const transactionData = {
              documentType: 'data_import',
              transactions: importResult.data.map(row => ({
                description: row.Description || row.description || 'Imported transaction',
                amount: Math.abs(parseFloat(row.Amount || row.amount || 0)),
                type: (row.Type || row.type || 'expense').toLowerCase(),
                date: row.Date || row.date || new Date().toISOString().split('T')[0],
                category: row.Category || row.category || 'other',
                paymentMethod: (row['Payment Method'] || row.paymentMethod || 'other').toLowerCase().replace(' ', '_'),
                location: row.Location || row.location || '',
                notes: row.Notes || row.notes || `Imported from ${receipt.originalName}`,
                confidence: 0.9
              }))
            };
            
            // Create transactions from imported data
            const createdTransactions = await createTransactionsFromReceipt(
              receipt.userId,
              receipt._id,
              transactionData
            );
            
            receipt.ocrResults = {
              extractedText: `Imported ${importResult.data.length} transactions from ${receipt.originalName}`,
              confidence: 1.0,
              processedAt: new Date(),
              processingTime: 0
            };
            receipt.parsedData = {
              documentType: 'data_import',
              merchantName: { value: 'Data Import', confidence: 1.0 },
              totalAmount: { value: 0, confidence: 0 },
              date: { value: new Date(), confidence: 1.0 },
              transactions: transactionData.transactions,
              items: [],
              rawText: `Imported ${importResult.data.length} transactions from ${receipt.originalName}`
            };
            receipt.status = 'processed';
            
            if (createdTransactions.length > 0) {
              console.log(`Created ${createdTransactions.length} transaction(s) from data file ${receipt._id}`);
              receipt.createdTransactions = createdTransactions.map(t => t._id);
            }
          } else {
            throw new Error('No valid data found in file');
          }
        } else {
          throw new Error('Unsupported file format');
        }
      } catch (error) {
        console.error('Error processing data file:', error);
        receipt.status = 'failed';
        receipt.lastProcessingError = {
          message: `Failed to process data file: ${error.message}`,
          timestamp: new Date()
        };
        receipt.processingAttempts += 1;
      }
    } else {
      // Process OCR for images and PDFs using the absolute file path
      const ocrResult = await ocrService.processReceipt(absolutePath);

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

        // Auto-create transactions from receipt data
        try {
          const createdTransactions = await createTransactionsFromReceipt(
            receipt.userId,
            receipt._id,
            ocrResult.parsedData
          );
          
          if (createdTransactions.length > 0) {
            console.log(`Created ${createdTransactions.length} transaction(s) from receipt ${receipt._id}`);
            
            // Update receipt with transaction references
            receipt.createdTransactions = createdTransactions.map(t => t._id);
          }
        } catch (transactionError) {
          console.error('Failed to create transactions from receipt:', transactionError);
          // Don't fail the entire process if transaction creation fails
        }
      } else {
        // Mark as failed with error details
        receipt.status = 'failed';
        receipt.lastProcessingError = {
          message: ocrResult.error || 'OCR processing failed',
          timestamp: new Date()
        };
        receipt.processingAttempts += 1;
      }
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

  console.log('Creating transaction from receipt:', req.params.id);
  console.log('Request body:', req.body);

  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    console.log('Receipt not found for ID:', req.params.id);
    return next(new AppError('Receipt not found', 404));
  }

  console.log('Receipt found:', receipt._id, 'Status:', receipt.status);

  if (receipt.transactionId) {
    console.log('Receipt already linked to transaction:', receipt.transactionId);
    return next(new AppError('Receipt is already linked to a transaction', 400));
  }

  if (receipt.status !== 'processed') {
    console.log('Receipt not processed. Current status:', receipt.status);
    return next(new AppError('Receipt must be processed before creating transaction', 400));
  }

  console.log('Receipt parsedData:', JSON.stringify(receipt.parsedData, null, 2));

  // Validate category
  let category;
  if (categoryId) {
    console.log('Looking for category with ID:', categoryId);
    category = await Category.findOne({
      _id: categoryId,
      userId: req.user.id,
      isActive: true
    });

    if (!category) {
      console.log('Category not found for ID:', categoryId);
      return next(new AppError('Invalid category', 400));
    }
  } else {
    console.log('No categoryId provided, looking for suggested category');
    // Try to find category by suggested name
    if (receipt.parsedData.category?.suggested) {
      console.log('Searching for category by name:', receipt.parsedData.category.suggested);
      category = await Category.findOne({
        name: { $regex: new RegExp(receipt.parsedData.category.suggested, 'i') },
        userId: req.user.id,
        type: 'expense',
        isActive: true
      });
    }

    if (!category) {
      console.log('No suggested category found, using default expense category');
      // Default to first expense category
      category = await Category.findOne({
        userId: req.user.id,
        type: 'expense',
        isActive: true
      });
    }
  }

  if (!category) {
    console.log('No category found at all');
    return next(new AppError('No suitable category found', 400));
  }

  console.log('Selected category:', category.name, 'ID:', category._id);

  // Helper function to map extracted payment method to valid enum values
  const mapPaymentMethod = (extractedMethod) => {
    if (!extractedMethod || typeof extractedMethod !== 'string') {
      return 'other';
    }
    
    const method = extractedMethod.toLowerCase().trim();
    
    // Mapping common OCR extracted values to valid enum values
    const methodMappings = {
      'cash': 'cash',
      'credit': 'credit_card',
      'credit card': 'credit_card',
      'creditcard': 'credit_card',
      'credit/debit': 'credit_card',
      'debit': 'debit_card',
      'debit card': 'debit_card',
      'debitcard': 'debit_card',
      'bank transfer': 'bank_transfer',
      'transfer': 'bank_transfer',
      'wire': 'bank_transfer',
      'check': 'check',
      'cheque': 'check',
      'digital wallet': 'digital_wallet',
      'paypal': 'digital_wallet',
      'venmo': 'digital_wallet',
      'apple pay': 'digital_wallet',
      'google pay': 'digital_wallet',
      'samsung pay': 'digital_wallet',
      'other': 'other'
    };
    
    return methodMappings[method] || 'other';
  };

  // Prepare transaction data using correct field structure
  let amount = customData?.amount || receipt.parsedData.totalAmount?.value || 0;
  
  // Ensure amount is valid
  if (!amount || amount <= 0) {
    console.log('Invalid amount detected:', amount, 'Using default amount of 1.00');
    amount = 1.00; // Use a default amount if parsing failed
  }

  const extractedPaymentMethod = receipt.parsedData.paymentMethod?.value;
  const validPaymentMethod = mapPaymentMethod(extractedPaymentMethod);
  
  console.log('Extracted payment method:', extractedPaymentMethod, '-> Mapped to:', validPaymentMethod);

  const transactionData = {
    userId: req.user.id,
    type: 'expense', // Receipts are typically for expenses
    amount: amount,
    description: customData?.description || receipt.parsedData.merchantName?.value || 'Receipt Transaction',
    categoryId: category._id,
    date: customData?.date || receipt.parsedData.date?.value || new Date(),
    paymentMethod: validPaymentMethod,
    location: receipt.parsedData.merchantName?.value || '',
    notes: customData?.notes || `Created from receipt: ${receipt.originalName}`,
    receiptId: receipt._id
  };

  console.log('Transaction data to create:', JSON.stringify(transactionData, null, 2));

  // Add items if available (but limit the total notes length)
  if (receipt.parsedData.items && receipt.parsedData.items.length > 0) {
    const itemsText = '\n\nItems:\n' + 
      receipt.parsedData.items.map(item => `- ${item.name}: $${item.totalPrice || item.unitPrice || 0}`).join('\n');
    
    const proposedNotes = transactionData.notes + itemsText;
    
    // Check if the combined notes would exceed the limit (500 characters)
    if (proposedNotes.length <= 500) {
      transactionData.notes = proposedNotes;
    } else {
      // Truncate if too long
      const availableSpace = 500 - transactionData.notes.length - 10; // Leave some buffer
      if (availableSpace > 20) {
        const truncatedItems = itemsText.substring(0, availableSpace) + '...';
        transactionData.notes += truncatedItems;
      }
      console.log('Notes truncated due to length limit');
    }
  }

  console.log('Final notes length:', transactionData.notes.length);

  // Create transaction
  console.log('Creating transaction...');
  let transaction;
  try {
    transaction = await Transaction.create(transactionData);
    console.log('Transaction created with ID:', transaction._id);
  } catch (createError) {
    console.error('Transaction creation failed:', createError);
    return next(new AppError(`Failed to create transaction: ${createError.message}`, 500));
  }

  // Link receipt to transaction
  console.log('Linking receipt to transaction...');
  try {
    receipt.transactionId = transaction._id;
    await receipt.save();
    console.log('Receipt linked successfully');
  } catch (linkError) {
    console.error('Failed to link receipt to transaction:', linkError);
    // Try to delete the created transaction to avoid orphaned records
    try {
      await Transaction.findByIdAndDelete(transaction._id);
    } catch (deleteError) {
      console.error('Failed to cleanup orphaned transaction:', deleteError);
    }
    return next(new AppError(`Failed to link receipt to transaction: ${linkError.message}`, 500));
  }

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

/**
 * Serve receipt file (image/PDF)
 */
const getReceiptFile = catchAsync(async (req, res, next) => {
  const receipt = await Receipt.findOne({
    _id: req.params.id,
    userId: req.user.id,
    isActive: true
  });

  if (!receipt) {
    return next(new AppError('Receipt not found', 404));
  }

  // Construct file path
  const filePath = path.join(process.cwd(), receipt.filePath);
  
  // Check if file exists
  if (!fsSync.existsSync(filePath)) {
    return next(new AppError('Receipt file not found on server', 404));
  }

  // Set appropriate content type
  const mimeType = receipt.mimetype || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${receipt.originalName}"`);
  
  // Stream the file
  const fileStream = fsSync.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    console.error('Error streaming file:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error serving file' });
    }
  });
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
  getReceiptStats,
  getReceiptFile
};

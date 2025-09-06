const express = require('express');
const multer = require('multer');
const path = require('path');
const FileImportService = require('../services/fileImportService');
const { protect } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const router = express.Router();
const fileImportService = new FileImportService();

// Configure multer for this route
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/imports/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, and PDF files are allowed.'));
    }
  }
});

/**
 * @route POST /api/import/upload
 * @desc Upload and process file for transaction import
 * @access Private
 */
router.post('/upload', protect, upload.single('file'), catchAsync(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(apiResponse.error('No file uploaded', 400));
    }
    
    const { importMode = 'bulk' } = req.body; // 'bulk' or 'single'
    const userId = req.user.id;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    logger.info(`Processing file import: ${req.file.originalname}, Mode: ${importMode}`);
    
    // Step 1: Extract file content
    const fileContent = await fileImportService.extractFileContent(filePath, mimeType);
    
    if (!fileContent || fileContent.trim().length === 0) {
      await fileImportService.cleanupFile(filePath);
      return res.status(400).json(apiResponse.error('Unable to extract content from file', 400));
    }
    
    // Step 2: Use Gemini AI to extract transaction data
    const extractedData = await fileImportService.extractTransactionsWithGemini(fileContent, importMode);
    
    // Step 3: Validate and process transactions
    const processedTransactions = await fileImportService.validateAndProcessTransactions(
      extractedData, 
      userId, 
      importMode
    );
    
    if (processedTransactions.length === 0) {
      await fileImportService.cleanupFile(filePath);
      return res.status(400).json(apiResponse.error('No valid transactions found in file', 400));
    }
    
    // Step 4: Save transactions to database
    const savedTransactions = await fileImportService.saveTransactions(processedTransactions);
    
    // Step 5: Cleanup uploaded file
    await fileImportService.cleanupFile(filePath);
    
    // Step 6: Prepare response
    const response = {
      success: true,
      message: `Successfully imported ${savedTransactions.length} transaction(s)`,
      data: {
        importedCount: savedTransactions.length,
        transactions: savedTransactions,
        mode: importMode,
        summary: importMode === 'bulk' ? extractedData.summary : {
          totalTransactions: 1,
          totalIncome: extractedData.transaction.type === 'income' ? extractedData.transaction.amount : 0,
          totalExpenses: extractedData.transaction.type === 'expense' ? extractedData.transaction.amount : 0,
          itemBreakdown: extractedData.itemBreakdown || []
        }
      }
    };
    
    logger.info(`Successfully imported ${savedTransactions.length} transactions for user ${userId}`);
    res.status(201).json(response);
    
  } catch (error) {
    logger.error('File import failed:', error);
    
    // Cleanup file on error
    if (req.file?.path) {
      await fileImportService.cleanupFile(req.file.path);
    }
    
    let errorMessage = 'Failed to import transactions from file';
    if (error.message.includes('Failed to extract')) {
      errorMessage = 'Unable to extract transaction data from file. Please ensure the file contains valid financial data.';
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Invalid file type. Please upload CSV, Excel, or PDF files only.';
    }
    
    res.status(500).json(apiResponse.error(errorMessage, 500));
  }
}));

/**
 * @route POST /api/import/preview
 * @desc Preview transactions from file without saving
 * @access Private
 */
router.post('/preview', protect, upload.single('file'), catchAsync(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(apiResponse.error('No file uploaded', 400));
    }
    
    const { importMode = 'bulk' } = req.body;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    
    // Step 1: Extract file content
    const fileContent = await fileImportService.extractFileContent(filePath, mimeType);
    
    if (!fileContent || fileContent.trim().length === 0) {
      await fileImportService.cleanupFile(filePath);
      return res.status(400).json(apiResponse.error('Unable to extract content from file', 400));
    }
    
    // Step 2: Use Gemini AI to extract transaction data
    const extractedData = await fileImportService.extractTransactionsWithGemini(fileContent, importMode);
    
    // Step 3: Cleanup uploaded file
    await fileImportService.cleanupFile(filePath);
    
    // Step 4: Return preview data
    const preview = {
      success: true,
      message: 'File processed successfully',
      data: {
        mode: importMode,
        preview: extractedData,
        estimatedTransactions: importMode === 'bulk' ? 
          extractedData.transactions?.length || 0 : 1
      }
    };
    
    res.status(200).json(preview);
    
  } catch (error) {
    logger.error('File preview failed:', error);
    
    // Cleanup file on error
    if (req.file?.path) {
      await fileImportService.cleanupFile(req.file.path);
    }
    
    res.status(500).json(apiResponse.error('Failed to preview file content', 500));
  }
}));

/**
 * @route GET /api/import/supported-formats
 * @desc Get list of supported file formats
 * @access Private
 */
router.get('/supported-formats', protect, catchAsync(async (req, res) => {
  const supportedFormats = {
    csv: {
      mimeTypes: ['text/csv'],
      extensions: ['.csv'],
      description: 'Comma-separated values file',
      maxSize: '10MB'
    },
    excel: {
      mimeTypes: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      extensions: ['.xls', '.xlsx'],
      description: 'Microsoft Excel spreadsheet',
      maxSize: '10MB'
    },
    pdf: {
      mimeTypes: ['application/pdf'],
      extensions: ['.pdf'],
      description: 'Portable Document Format',
      maxSize: '10MB'
    }
  };
  
  res.status(200).json(apiResponse.success(supportedFormats, 'Supported formats retrieved'));
}));

module.exports = router;

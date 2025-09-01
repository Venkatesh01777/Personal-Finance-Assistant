const express = require('express');
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');
const { 
  validateReceiptUpload,
  validateReceipt, 
  validateReceiptUpdate, 
  validateQuery 
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Main CRUD routes
router
  .route('/')
  .get(validateQuery, receiptController.getReceipts)
  .post(receiptController.upload, validateReceiptUpload, receiptController.uploadReceipt);

router
  .route('/:id')
  .get(receiptController.getReceipt)
  .patch(validateReceiptUpdate, receiptController.updateReceipt)
  .delete(receiptController.deleteReceipt);

// OCR and processing routes
router.post('/:id/reprocess', receiptController.reprocessReceipt);

// Transaction integration
router.post('/:id/create-transaction', receiptController.createTransactionFromReceipt);
router.patch('/:id/unlink-transaction', receiptController.unlinkReceiptFromTransaction);

// Analytics
router.get('/analytics/stats', validateQuery, receiptController.getReceiptStats);

module.exports = router;

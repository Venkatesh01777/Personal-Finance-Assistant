const express = require('express');
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { 
  validateTransaction, 
  validateTransactionUpdate, 
  validateQuery,
  validateTransactionQuery 
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Main CRUD routes
router
  .route('/')
  .get(validateTransactionQuery, transactionController.getTransactions)
  .post(validateTransaction, transactionController.createTransaction);

router
  .route('/:id')
  .get(transactionController.getTransaction)
  .patch(validateTransactionUpdate, transactionController.updateTransaction)
  .delete(transactionController.deleteTransaction);

// Bulk operations
router.post('/bulk-delete', transactionController.bulkDeleteTransactions);

// Special operations
router.post('/:id/duplicate', transactionController.duplicateTransaction);

// Analytics and reporting
router.get('/summary/date-range', validateTransactionQuery, transactionController.getTransactionSummary);
router.get('/category/:categoryId', validateTransactionQuery, transactionController.getTransactionsByCategory);

// Export functionality
router.get('/export/data', validateTransactionQuery, transactionController.exportTransactions);

module.exports = router;

const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { 
  validateCategory, 
  validateCategoryUpdate, 
  validateQuery 
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Main CRUD routes
router
  .route('/')
  .get(validateQuery, categoryController.getCategories)
  .post(validateCategory, categoryController.createCategory);

router
  .route('/:id')
  .get(categoryController.getCategory)
  .patch(validateCategoryUpdate, categoryController.updateCategory)
  .delete(categoryController.deleteCategory);

// Analytics and statistics
router.get('/analytics/stats', validateQuery, categoryController.getCategoryStats);
router.get('/analytics/popular', validateQuery, categoryController.getPopularCategories);

// Utility routes
router.post('/reset-defaults', categoryController.resetToDefaultCategories);

module.exports = router;

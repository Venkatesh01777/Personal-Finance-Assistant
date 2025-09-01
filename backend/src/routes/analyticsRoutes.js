const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Dashboard and overview
router.get('/dashboard', validateQuery, analyticsController.getDashboardOverview);

// Spending analysis
router.get('/trends', validateQuery, analyticsController.getSpendingTrends);
router.get('/categories', validateQuery, analyticsController.getCategoryBreakdown);
router.get('/monthly', validateQuery, analyticsController.getMonthlyComparison);
router.get('/monthly-comparison', validateQuery, analyticsController.getMonthlyComparison);

// Budget analysis
router.get('/budget', validateQuery, analyticsController.getBudgetAnalysis);

// Export functionality
router.get('/export', validateQuery, analyticsController.exportAnalytics);

module.exports = router;

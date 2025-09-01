const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateUser, validateUserUpdate, validatePasswordChange } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUser, authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/profile', authController.getProfile);
router.patch('/profile', validateUserUpdate, authController.updateProfile);
router.patch('/change-password', validatePasswordChange, authController.changePassword);
router.patch('/deactivate', authController.deactivateAccount);
router.get('/dashboard', authController.getDashboardStats);
router.post('/logout', authController.logout);

module.exports = router;

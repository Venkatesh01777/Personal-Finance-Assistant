const { isConnected } = require('../config/database');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Middleware to check database connection before processing API requests
 */
const checkDatabaseConnection = (req, res, next) => {
  if (!isConnected()) {
    logger.warn('Database connection not ready for request:', req.path);
    return next(new AppError('Database connection unavailable. Please try again later.', 503));
  }
  next();
};

module.exports = {
  checkDatabaseConnection
};

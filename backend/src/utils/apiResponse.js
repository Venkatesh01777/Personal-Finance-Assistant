// API Response utility functions

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Response data
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...(meta && { meta })
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Array} errors - Detailed error array
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors })
  };

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @param {String} message - Success message
 */
const sendPaginated = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const meta = {
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNext,
      hasPrev,
      ...(hasNext && { nextPage: page + 1 }),
      ...(hasPrev && { prevPage: page - 1 })
    }
  };

  return sendSuccess(res, 200, message, data, meta);
};

/**
 * Handle async operations and send response
 * @param {Function} operation - Async operation to execute
 * @param {Object} res - Express response object
 * @param {String} successMessage - Success message
 * @param {Number} successStatus - Success status code
 */
const handleAsync = async (operation, res, successMessage = 'Operation successful', successStatus = 200) => {
  try {
    const result = await operation();
    return sendSuccess(res, successStatus, successMessage, result);
  } catch (error) {
    console.error('Async operation error:', error);
    return sendError(res, error.statusCode || 500, error.message || 'Internal Server Error');
  }
};

/**
 * Create filter object from query parameters
 * @param {Object} query - Express request query object
 * @param {Array} allowedFields - Array of allowed filter fields
 * @param {String} userId - User ID for user-specific filters
 */
const createFilter = (query, allowedFields = [], userId = null) => {
  const filter = {};

  // Add user filter if userId provided
  if (userId) {
    filter.userId = userId;
  }

  // Add isActive filter by default
  filter.isActive = true;

  // Process allowed fields
  allowedFields.forEach(field => {
    if (query[field] !== undefined) {
      // Handle special cases
      switch (field) {
        case 'startDate':
        case 'endDate':
          // Only process if the field has a valid value
          if (query[field] && query[field].trim() !== '') {
            if (!filter.date) filter.date = {};
            const dateValue = new Date(query[field]);
            // Check if the date is valid
            if (!isNaN(dateValue.getTime())) {
              if (field === 'startDate') filter.date.$gte = dateValue;
              if (field === 'endDate') filter.date.$lte = dateValue;
            }
          }
          break;
        
        case 'minAmount':
        case 'maxAmount':
          // Only process if the field has a valid value
          if (query[field] && query[field].toString().trim() !== '') {
            const amount = parseFloat(query[field]);
            if (!isNaN(amount)) {
              if (!filter.amount) filter.amount = {};
              if (field === 'minAmount') filter.amount.$gte = amount;
              if (field === 'maxAmount') filter.amount.$lte = amount;
            }
          }
          break;
        
        case 'search':
          // Only process if search has a valid value
          if (query[field] && query[field].trim() !== '') {
            filter.$or = [
              { description: { $regex: query[field], $options: 'i' } },
              { notes: { $regex: query[field], $options: 'i' } }
            ];
          }
          break;
        
        case 'tags':
          // Only process if tags has a valid value
          if (query[field] && query[field].length > 0) {
            const tags = Array.isArray(query[field]) ? query[field] : [query[field]];
            // Filter out empty strings
            const validTags = tags.filter(tag => tag && tag.toString().trim() !== '');
            if (validTags.length > 0) {
              filter.tags = { $in: validTags };
            }
          }
          break;
        
        default:
          // Only add to filter if the field has a valid value (not empty string)
          if (query[field] && query[field].toString().trim() !== '') {
            filter[field] = query[field];
          }
      }
    }
  });

  return filter;
};

/**
 * Create sort object from query parameters
 * @param {String} sortString - Sort string from query (e.g., '-date,amount')
 */
const createSort = (sortString = '-createdAt') => {
  const sortFields = sortString.split(',');
  const sort = {};

  sortFields.forEach(field => {
    if (field.startsWith('-')) {
      sort[field.substring(1)] = -1;
    } else {
      sort[field] = 1;
    }
  });

  return sort;
};

/**
 * Calculate pagination values
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 */
const calculatePagination = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, skip };
};

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code
 * @param {String} locale - Locale for formatting
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Calculate date range for common periods
 * @param {String} period - Period type (thisMonth, lastMonth, thisYear, etc.)
 */
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    
    case 'thisWeek':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      startDate = startOfWeek;
      endDate = new Date();
      break;
    
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    
    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    
    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    
    default:
      // Default to current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  return { startDate, endDate };
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  handleAsync,
  createFilter,
  createSort,
  calculatePagination,
  formatCurrency,
  getDateRange
};

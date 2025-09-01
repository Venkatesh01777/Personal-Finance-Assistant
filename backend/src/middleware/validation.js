const Joi = require('joi');
const AppError = require('../utils/appError');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return next(new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400));
    }

    next();
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(6).max(128).required(),
    firstName: Joi.string().min(2).max(50).required().trim(),
    lastName: Joi.string().min(2).max(50).required().trim(),
    dateOfBirth: Joi.date().max('now').required(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
      .messages({
        'string.pattern.base': 'Phone number must be in valid international format'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).trim(),
    lastName: Joi.string().min(2).max(50).trim(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
      .messages({
        'string.pattern.base': 'Phone number must be in valid international format'
      }),
    preferences: Joi.object({
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'),
      language: Joi.string().valid('en', 'es', 'fr', 'de', 'it'),
      timezone: Joi.string(),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        budgetAlerts: Joi.boolean(),
        transactionAlerts: Joi.boolean()
      })
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
  })
};

// Transaction validation schemas
const transactionSchemas = {
  create: Joi.object({
    type: Joi.string().valid('income', 'expense').required(),
    amount: Joi.number().positive().max(1000000).required(),
    description: Joi.string().min(1).max(200).required().trim(),
    category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      .messages({
        'string.pattern.base': 'Invalid category ID format'
      }),
    date: Joi.date().max('now').default(Date.now),
    paymentMethod: Joi.string().valid(
      'cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'
    ).default('cash'),
    merchant: Joi.string().max(100).trim().allow(''),
    location: Joi.string().max(100).trim().allow(''),
    tags: Joi.array().items(Joi.string().max(20).trim()).max(10).default([]),
    notes: Joi.string().max(500).trim().allow(''),
    isRecurring: Joi.boolean().default(false),
    recurringDetails: Joi.when('isRecurring', {
      is: true,
      then: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
        interval: Joi.number().integer().min(1).required(),
        endDate: Joi.date().greater('now').required()
      }).required(),
      otherwise: Joi.forbidden()
    })
  }),

  update: Joi.object({
    type: Joi.string().valid('income', 'expense'),
    amount: Joi.number().positive().max(1000000),
    description: Joi.string().min(1).max(200).trim(),
    category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Invalid category ID format'
      }),
    date: Joi.date(), // Removed .max('now') for updates to allow future dates
    paymentMethod: Joi.string().valid(
      'cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'
    ),
    merchant: Joi.string().max(100).trim().allow(''),
    location: Joi.string().max(100).trim().allow(''),
    tags: Joi.array().items(Joi.string().max(20).trim()).max(10),
    notes: Joi.string().max(500).trim().allow(''),
    isRecurring: Joi.boolean(),
    recurringDetails: Joi.when('isRecurring', {
      is: true,
      then: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
        interval: Joi.number().integer().min(1).required(),
        endDate: Joi.date().greater('now').required()
      }),
      otherwise: Joi.forbidden()
    })
  }).min(1)
};

// Category validation schemas
const categorySchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(30).required().trim(),
    type: Joi.string().valid('income', 'expense').required(),
    description: Joi.string().max(200).trim(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FF0000)'
      }),
    icon: Joi.string().trim(),
    budget: Joi.object({
      monthly: Joi.number().positive().max(1000000),
      alertThreshold: Joi.number().min(0).max(100)
    }),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(30).trim(),
    type: Joi.string().valid('income', 'expense'),
    description: Joi.string().max(200).trim(),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #FF0000)'
      }),
    icon: Joi.string().trim(),
    budget: Joi.object({
      monthly: Joi.number().positive().max(1000000),
      alertThreshold: Joi.number().min(0).max(100)
    }),
    isActive: Joi.boolean()
  }).min(1)
};

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('-createdAt'),
    search: Joi.string().allow('').trim()
  }),

  dateRange: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    type: Joi.string().valid('income', 'expense'),
    categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
  }),

  transactionFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('-date'),
    type: Joi.string().allow('').valid('', 'income', 'expense'),
    categoryId: Joi.string().allow('').pattern(/^[0-9a-fA-F]{24}$/),
    startDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('')
    ),
    endDate: Joi.alternatives().try(
      Joi.date().min(Joi.ref('startDate')),
      Joi.string().allow('')
    ),
    minAmount: Joi.number().positive(),
    maxAmount: Joi.number().positive().min(Joi.ref('minAmount')),
    search: Joi.string().allow('').trim(),
    paymentMethod: Joi.string().allow('').valid(
      '', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other'
    ),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
  })
};

// Receipt validation schemas
const receiptSchemas = {
  upload: Joi.object({
    description: Joi.string().max(200).trim().optional(),
    notes: Joi.string().max(500).trim().optional()
  }).optional(),
  corrections: Joi.object({
    merchantName: Joi.string().max(100).trim(),
    totalAmount: Joi.number().positive().max(1000000),
    date: Joi.date().max('now'),
    category: Joi.string().max(30).trim(),
    notes: Joi.string().max(500).trim()
  }).min(1)
};

// MongoDB ObjectId validation
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdPattern.test(id)) {
    return next(new AppError('Invalid ID format', 400));
  }
  
  next();
};

module.exports = {
  validate,
  validateObjectId,
  userSchemas,
  transactionSchemas,
  categorySchemas,
  querySchemas,
  receiptSchemas,
  // Specific validation middlewares
  validateUser: validate(userSchemas.register, 'body'),
  validateUserLogin: validate(userSchemas.login, 'body'),
  validateUserUpdate: validate(userSchemas.updateProfile, 'body'),
  validatePasswordChange: validate(userSchemas.changePassword, 'body'),
  validateTransaction: validate(transactionSchemas.create, 'body'),
  validateTransactionUpdate: validate(transactionSchemas.update, 'body'),
  validateCategory: validate(categorySchemas.create, 'body'),
  validateCategoryUpdate: validate(categorySchemas.update, 'body'),
  validateReceiptUpload: validate(receiptSchemas.upload, 'body'),
  validateReceipt: validate(receiptSchemas.corrections, 'body'),
  validateReceiptUpdate: validate(receiptSchemas.corrections, 'body'),
  validateQuery: validate(querySchemas.pagination, 'query'),
  validateTransactionQuery: validate(querySchemas.transactionFilters, 'query')
};

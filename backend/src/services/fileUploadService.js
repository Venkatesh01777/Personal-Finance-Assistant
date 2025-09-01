const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const AppError = require('../utils/appError');

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads', 'receipts'),
    path.join(process.cwd(), 'uploads', 'temp')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
    }
  }
};

// Initialize upload directories
ensureUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'receipts');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, name);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed', 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow 1 file at a time
  }
});

/**
 * Process uploaded image (resize and optimize)
 */
const processImage = async (filePath, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    const processedPath = filePath.replace(/\.[^/.]+$/, `_processed.${format}`);
    
    await sharp(filePath)
      .resize(maxWidth, maxHeight, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality })
      .toFile(processedPath);

    return processedPath;
  } catch (error) {
    console.error('Image processing failed:', error);
    throw new AppError('Failed to process image', 500);
  }
};

/**
 * Delete file from filesystem
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
};

/**
 * Get file info
 */
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath);
    
    return {
      size: stats.size,
      extension: ext,
      isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()),
      isPDF: ext.toLowerCase() === '.pdf',
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    console.error('Failed to get file info:', error);
    return null;
  }
};

/**
 * Validate file size before upload
 */
const validateFileSize = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (req.file && req.file.size > maxSize) {
      return next(new AppError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`, 400));
    }
    next();
  };
};

/**
 * Clean up old files (utility function)
 */
const cleanupOldFiles = async (directory, maxAge = 30) => {
  try {
    const files = await fs.readdir(directory);
    const now = Date.now();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

/**
 * Handle upload errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 10MB', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Only 1 file allowed', 400));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400));
    }
  }
  
  next(error);
};

// Middleware for single file upload
const uploadSingle = (fieldName = 'receipt') => {
  return [
    upload.single(fieldName),
    handleUploadError
  ];
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'receipts', maxCount = 5) => {
  return [
    upload.array(fieldName, maxCount),
    handleUploadError
  ];
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  processImage,
  deleteFile,
  getFileInfo,
  validateFileSize,
  cleanupOldFiles,
  handleUploadError,
  ensureUploadDirs
};

const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const pdf2pic = require('pdf2pic');
const logger = require('../utils/logger');
const geminiOCRService = require('./geminiOCRService');

class OCRService {
  constructor() {
    this.tesseractWorker = null;
    this.isInitialized = false;
    
    this.preprocessingConfig = {
      dpi: 300,
      contrast: 1.2,
      brightness: 1.1,
      sharpen: true
    };
  }

  /**
   * Initialize Tesseract worker
   */
  async initializeTesseract() {
    if (this.isInitialized && this.tesseractWorker) {
      return this.tesseractWorker;
    }

    try {
      logger.info('Initializing Tesseract worker...');
      this.tesseractWorker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      await this.tesseractWorker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/$-:',
      });
      
      this.isInitialized = true;
      logger.info('Tesseract worker initialized successfully');
      return this.tesseractWorker;
    } catch (error) {
      logger.error('Failed to initialize Tesseract worker:', error);
      throw error;
    }
  }

  /**
   * Process receipt and extract text with parsed data
   * Enhanced with Gemini AI + Tesseract fallback
   * @param {String} filePath - Path to the uploaded file
   * @returns {Object} - OCR results with parsed data
   */
  async processReceipt(filePath) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting receipt processing for file: ${filePath}`);
      
      const ocrMethod = process.env.OCR_METHOD || 'gemini';
      
      // Try Gemini AI first if available and configured
      if (ocrMethod === 'gemini' && geminiOCRService.isAvailable()) {
        logger.info('Using Gemini AI for receipt processing...');
        const geminiResult = await geminiOCRService.processReceipt(filePath);
        
        if (geminiResult.success && geminiResult.confidence > 0.5) {
          logger.info(`Gemini processing successful with confidence: ${geminiResult.confidence}`);
          return geminiResult;
        } else {
          logger.warn('Gemini processing failed or low confidence, falling back to Tesseract...');
        }
      }
      
      // Fallback to Tesseract or use if explicitly configured
      logger.info('Using Tesseract OCR for receipt processing...');
      return await this.processWithTesseract(filePath);
      
    } catch (error) {
      logger.error('Receipt processing failed:', error);
      return {
        success: false,
        error: error.message,
        extractedText: '',
        parsedData: this.getEmptyParsedData(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        method: 'error'
      };
    }
  }

  /**
   * Process receipt using Tesseract OCR (fallback method)
   * @param {String} filePath - Path to the uploaded file
   * @returns {Object} - OCR results with parsed data
   */
  async processWithTesseract(filePath) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting Tesseract OCR processing for file: ${filePath}`);
      
      // Step 1: Handle different file types
      const imagePaths = await this.prepareImageFiles(filePath);
      
      // Step 2: Initialize Tesseract if needed
      await this.initializeTesseract();
      
      // Step 3: Process all images and combine text
      let combinedText = '';
      const confidenceScores = [];
      
      for (const imagePath of imagePaths) {
        const result = await this.extractTextFromImage(imagePath);
        combinedText += result.text + '\n';
        confidenceScores.push(result.confidence);
      }
      
      // Step 4: Parse the extracted text
      const parsedData = this.parseReceiptData(combinedText);
      
      // Step 5: Calculate overall confidence
      const avgConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length 
        : 0;
      
      // Step 6: Clean up temporary files
      await this.cleanupTempFiles(imagePaths, filePath);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Tesseract OCR processing completed in ${processingTime}ms with confidence: ${avgConfidence}`);
      
      return {
        success: true,
        extractedText: combinedText.trim(),
        parsedData,
        confidence: avgConfidence / 100, // Convert to 0-1 scale
        processingTime,
        method: 'tesseract'
      };
      
    } catch (error) {
      logger.error('Tesseract OCR processing failed:', error);
      return {
        success: false,
        error: error.message,
        extractedText: '',
        parsedData: this.getEmptyParsedData(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        method: 'tesseract'
      };
    }
  }

  /**
   * Prepare image files from different input types
   * @param {String} filePath - Original file path
   * @returns {Array} - Array of image file paths ready for OCR
   */
  async prepareImageFiles(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      return await this.convertPdfToImages(filePath);
    } else if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(ext)) {
      const processedPath = await this.preprocessImage(filePath);
      return [processedPath];
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Convert PDF to images using pdf2pic
   * @param {String} pdfPath - Path to PDF file
   * @returns {Array} - Array of image paths
   */
  async convertPdfToImages(pdfPath) {
    try {
      logger.info('Converting PDF to images...');
      
      const options = {
        density: 300,
        saveFilename: `pdf_page`,
        savePath: path.dirname(pdfPath),
        format: 'png',
        width: 2000,
        height: 2000
      };
      
      const convert = pdf2pic.fromPath(pdfPath, options);
      const results = await convert.bulk(-1, { responseType: 'image' });
      
      const imagePaths = results.map(result => result.path);
      logger.info(`Converted PDF to ${imagePaths.length} images`);
      
      return imagePaths;
    } catch (error) {
      logger.error('PDF to image conversion failed:', error);
      throw new Error(`Failed to convert PDF: ${error.message}`);
    }
  }

  /**
   * Preprocess image to improve OCR accuracy
   * @param {String} filePath - Original file path
   * @returns {String} - Processed file path
   */
  async preprocessImage(filePath) {
    try {
      const ext = path.extname(filePath);
      const processedPath = filePath.replace(ext, `_processed${ext}`);
      
      await sharp(filePath)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()
        .modulate({
          brightness: this.preprocessingConfig.brightness,
          saturation: 0.8
        })
        .linear(this.preprocessingConfig.contrast, 0)
        .sharpen()
        .grayscale()
        .png({ quality: 90 })
        .toFile(processedPath);
      
      logger.info(`Image preprocessed: ${processedPath}`);
      return processedPath;
      
    } catch (error) {
      logger.warn('Image preprocessing failed, using original:', error.message);
      return filePath;
    }
  }

  /**
   * Extract text from a single image using Tesseract
   * @param {String} imagePath - Path to image file
   * @returns {Object} - Text and confidence
   */
  async extractTextFromImage(imagePath) {
    try {
      logger.info(`Extracting text from: ${imagePath}`);
      
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(imagePath);
      
      logger.info(`Text extraction completed with confidence: ${confidence}%`);
      return { text: text.trim(), confidence };
      
    } catch (error) {
      logger.error('Text extraction failed:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Parse extracted text to identify receipt components
   * @param {String} text - Raw OCR text
   * @returns {Object} - Parsed receipt data
   */
  parseReceiptData(text) {
    if (!text || text.trim().length === 0) {
      return this.getEmptyParsedData();
    }

    logger.info('Parsing receipt data...');
    
    return {
      merchantName: this.extractMerchantName(text),
      totalAmount: this.extractTotalAmount(text),
      date: this.extractDate(text),
      items: this.extractLineItems(text),
      taxAmount: this.extractTaxAmount(text),
      category: this.suggestCategory(text),
      paymentMethod: this.extractPaymentMethod(text)
    };
  }

  /**
   * Extract merchant name from receipt text
   */
  extractMerchantName(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      if (this.isLikelyMerchantName(line)) {
        return {
          value: line,
          confidence: this.calculateMerchantConfidence(line, i)
        };
      }
    }
    
    return { value: '', confidence: 0 };
  }

  /**
   * Extract total amount from receipt text
   */
  extractTotalAmount(text) {
    const amountPatterns = [
      /total[:\s]*\$?\s*(\d+\.?\d{0,2})/gi,
      /amount[:\s]*\$?\s*(\d+\.?\d{0,2})/gi,
      /balance[:\s]*\$?\s*(\d+\.?\d{0,2})/gi,
      /\$\s*(\d+\.\d{2})\s*$/gm,
      /(\d+\.\d{2})\s*$/gm
    ];

    const amounts = [];
    
    amountPatterns.forEach((pattern, index) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) {
          amounts.push({
            value: amount,
            confidence: this.calculateAmountConfidence(match[0], index, amount),
            context: match[0]
          });
        }
      });
    });

    if (amounts.length === 0) {
      return { value: 0, confidence: 0 };
    }

    amounts.sort((a, b) => b.confidence - a.confidence);
    return {
      value: amounts[0].value,
      confidence: amounts[0].confidence
    };
  }

  /**
   * Extract date from receipt text
   */
  extractDate(text) {
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi
    ];

    const dates = [];
    
    datePatterns.forEach((pattern, index) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const dateObj = this.parseDate(match[0]);
        if (dateObj && this.isReasonableDate(dateObj)) {
          dates.push({
            value: dateObj,
            confidence: this.calculateDateConfidence(match[0], index)
          });
        }
      });
    });

    if (dates.length === 0) {
      return { value: new Date(), confidence: 0 };
    }

    dates.sort((a, b) => b.confidence - a.confidence);
    return {
      value: dates[0].value,
      confidence: dates[0].confidence
    };
  }

  /**
   * Extract line items from receipt
   */
  extractLineItems(text) {
    const lines = text.split('\n');
    const items = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      const itemPattern = /^(.+?)\s+\$?(\d+\.?\d{0,2})$/;
      const match = trimmedLine.match(itemPattern);
      
      if (match && match[1].length > 2 && match[1].length < 50) {
        const itemName = match[1].trim();
        const price = parseFloat(match[2]);
        
        if (!this.isLikelyTotalLine(itemName) && price > 0 && price < 1000) {
          items.push({
            name: itemName,
            price: price,
            confidence: this.calculateItemConfidence(itemName, price)
          });
        }
      }
    });

    return items.slice(0, 20);
  }

  /**
   * Extract tax amount
   */
  extractTaxAmount(text) {
    const taxPatterns = [
      /tax[:\s]*\$?\s*(\d+\.?\d{0,2})/gi,
      /hst[:\s]*\$?\s*(\d+\.?\d{0,2})/gi,
      /gst[:\s]*\$?\s*(\d+\.?\d{0,2})/gi
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 1000) {
          return { value: amount, confidence: 0.8 };
        }
      }
    }

    return { value: 0, confidence: 0 };
  }

  /**
   * Suggest category based on merchant and content
   */
  suggestCategory(text) {
    const textLower = text.toLowerCase();
    
    const categoryMappings = {
      'groceries': ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'costco', 'grocery'],
      'food & dining': ['mcdonalds', 'burger king', 'starbucks', 'restaurant', 'cafe', 'pizza'],
      'transportation': ['shell', 'exxon', 'bp', 'chevron', 'gas', 'fuel', 'uber', 'lyft'],
      'shopping': ['amazon', 'mall', 'store', 'retail'],
      'healthcare': ['pharmacy', 'cvs', 'walgreens', 'hospital', 'clinic']
    };

    for (const [category, keywords] of Object.entries(categoryMappings)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          return { suggested: category, confidence: 0.7 };
        }
      }
    }

    return { suggested: 'other', confidence: 0.3 };
  }

  /**
   * Extract payment method
   */
  extractPaymentMethod(text) {
    const textLower = text.toLowerCase();
    
    const paymentMethods = {
      'credit_card': ['credit', 'visa', 'mastercard', 'amex'],
      'debit_card': ['debit'],
      'cash': ['cash', 'change'],
      'digital_wallet': ['apple pay', 'google pay', 'paypal']
    };

    for (const [method, keywords] of Object.entries(paymentMethods)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          return { value: method, confidence: 0.6 };
        }
      }
    }

    return { value: 'other', confidence: 0.1 };
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(imagePaths, originalPath) {
    for (const imagePath of imagePaths) {
      if (imagePath !== originalPath && imagePath.includes('_processed')) {
        try {
          await fs.unlink(imagePath);
          logger.info(`Cleaned up temp file: ${imagePath}`);
        } catch (error) {
          logger.warn(`Failed to cleanup temp file ${imagePath}:`, error.message);
        }
      }
    }
  }

  /**
   * Terminate Tesseract worker
   */
  async terminate() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.isInitialized = false;
      logger.info('Tesseract worker terminated');
    }
  }

  // Helper methods (same as before but simplified)
  isLikelyMerchantName(line) {
    if (/^\d+$/.test(line.replace(/\s/g, ''))) return false;
    if (/^\d+\s+[a-z\s]+/i.test(line)) return false;
    if (/\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}/.test(line)) return false;
    return line.length >= 3 && line.length <= 50;
  }

  isLikelyTotalLine(text) {
    const totalWords = ['total', 'amount', 'subtotal', 'tax', 'balance'];
    return totalWords.some(word => text.toLowerCase().includes(word));
  }

  isReasonableDate(date) {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return date >= oneYearAgo && date <= oneMonthFuture;
  }

  parseDate(dateString) {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  calculateMerchantConfidence(name, position) {
    let confidence = 0.5;
    if (position < 3) confidence += 0.3;
    if (name.length >= 5 && name.length <= 30) confidence += 0.2;
    return Math.min(confidence, 1);
  }

  calculateAmountConfidence(context, patternIndex, amount) {
    let confidence = 0.3;
    if (patternIndex === 0) confidence += 0.4;
    if (context.toLowerCase().includes('total')) confidence += 0.3;
    if (amount >= 1 && amount <= 500) confidence += 0.2;
    return Math.min(confidence, 1);
  }

  calculateDateConfidence(dateString, patternIndex) {
    let confidence = 0.4;
    if (patternIndex === 0) confidence += 0.3;
    return Math.min(confidence, 1);
  }

  calculateItemConfidence(name, price) {
    let confidence = 0.3;
    if (name.length >= 3 && name.length <= 30) confidence += 0.2;
    if (price >= 0.5 && price <= 100) confidence += 0.2;
    return Math.min(confidence, 1);
  }

  getEmptyParsedData() {
    return {
      merchantName: { value: '', confidence: 0 },
      totalAmount: { value: 0, confidence: 0 },
      date: { value: new Date(), confidence: 0 },
      items: [],
      taxAmount: { value: 0, confidence: 0 },
      category: { suggested: 'other', confidence: 0 },
      paymentMethod: { value: 'other', confidence: 0 }
    };
  }
}

// Create and export a singleton instance
const ocrService = new OCRService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await ocrService.terminate();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ocrService.terminate();
  process.exit(0);
});

module.exports = ocrService;

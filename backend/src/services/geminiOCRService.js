const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const pdf2pic = require('pdf2pic');
const logger = require('../utils/logger');

class GeminiOCRService {
  constructor() {
    // Initialize lazily - don't check environment variables at construction
    this.genAI = null;
    this.model = null;
    this.initialized = false;
  }

  /**
   * Initialize Gemini AI (lazy initialization)
   */
  initialize() {
    if (this.initialized) return;
    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: geminiModel });
      logger.info('Gemini AI initialized successfully');
    } else {
      logger.warn('Gemini API key not provided, service will not be available');
    }
    
    this.initialized = true;
  }

  /**
   * Check if Gemini is available
   * @returns {Boolean} - Whether Gemini is configured and available
   */
  isAvailable() {
    this.initialize(); // Initialize on first check
    return !!(this.genAI && this.model);
  }

  /**
   * Process receipt using Gemini AI Vision
   * @param {String} filePath - Path to the receipt file
   * @returns {Object} - Processed receipt data
   */
  async processReceipt(filePath) {
    const startTime = Date.now();
    
    try {
      if (!this.isAvailable()) {
        throw new Error('Gemini API not configured');
      }

      logger.info('Processing receipt with Gemini AI...');
      
      // Handle PDF conversion if necessary
      const imagePath = await this.convertToImageIfNeeded(filePath);
      
      // Read and encode image to base64
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);
      
      // Create the prompt for receipt analysis
      const prompt = this.createGeminiPrompt();
      
      // Generate content using Gemini
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response from Gemini
      const parsedData = this.parseGeminiResponse(text);
      
      // Clean up converted files if necessary
      if (imagePath !== filePath) {
        await fs.unlink(imagePath).catch(() => {});
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        extractedText: parsedData.rawText || '',
        parsedData: this.formatParsedData(parsedData),
        confidence: parsedData.confidence || 0.8,
        processingTime,
        method: 'gemini'
      };
      
    } catch (error) {
      logger.error('Gemini processing failed:', error);
      return {
        success: false,
        error: error.message,
        extractedText: '',
        parsedData: this.getEmptyParsedData(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        method: 'gemini'
      };
    }
  }

  /**
   * Create prompt for Gemini AI receipt analysis
   * @returns {String} - Formatted prompt
   */
  createGeminiPrompt() {
    return `
Analyze this receipt/financial document and extract transaction information. Return ONLY a valid JSON object with this exact structure:

{
  "documentType": "receipt|bank_statement|invoice|expense_report",
  "merchantName": {
    "value": "extracted store/merchant name",
    "confidence": 0.0-1.0
  },
  "documentDate": {
    "value": "YYYY-MM-DD",
    "confidence": 0.0-1.0
  },
  "transactions": [
    {
      "description": "transaction description (e.g., 'Groceries at Walmart')",
      "amount": 0.00,
      "type": "expense|income",
      "date": "YYYY-MM-DD",
      "category": "food_dining|groceries|transportation|shopping|healthcare|entertainment|utilities|bills|salary|freelance|other",
      "paymentMethod": "cash|credit_card|debit_card|bank_transfer|digital_wallet|other",
      "location": "merchant/store location if available",
      "notes": "additional notes or item details",
      "confidence": 0.0-1.0
    }
  ],
  "items": [
    {
      "name": "item name",
      "price": 0.00,
      "quantity": 1,
      "category": "item category",
      "confidence": 0.0-1.0
    }
  ],
  "totals": {
    "subtotal": {
      "value": 0.00,
      "confidence": 0.0-1.0
    },
    "taxAmount": {
      "value": 0.00,
      "confidence": 0.0-1.0
    },
    "totalAmount": {
      "value": 0.00,
      "confidence": 0.0-1.0
    }
  },
  "paymentInfo": {
    "method": "cash|credit_card|debit_card|bank_transfer|digital_wallet|other",
    "lastFourDigits": "1234",
    "confidence": 0.0-1.0
  },
  "rawText": "all extracted text from document",
  "confidence": 0.0-1.0
}

Rules:
- For single receipts: Create ONE transaction with the total amount
- For bank statements/expense reports: Create MULTIPLE transactions for each line item
- For CSV/Excel data: Extract each row as a separate transaction
- Extract all visible text accurately
- Identify the main total amount (not subtotals) for single transactions
- Convert dates to YYYY-MM-DD format
- Use descriptive transaction descriptions (e.g., "Groceries at Walmart", "Coffee at Starbucks")
- Suggest the most appropriate category based on merchant and items
- For expenses, amount should be positive (we'll handle the expense type separately)
- Set confidence based on text clarity and certainty
- If information is unclear or missing, set confidence to 0 and use reasonable defaults
- For receipts, typically type should be "expense"
- Return ONLY the JSON, no additional text or explanations

Categories mapping:
- Restaurants, cafes, food purchases → "food_dining"
- Supermarkets, grocery stores → "groceries"  
- Gas stations, uber, taxi → "transportation"
- Retail stores, online shopping → "shopping"
- Hospitals, pharmacies, medical → "healthcare"
- Movies, games, subscriptions → "entertainment"
- Electricity, water, internet → "utilities"
- Rent, phone, insurance → "bills"
- Salary deposits → "salary"
- Contract work payments → "freelance"
`;
  }

  /**
   * Parse Gemini API response
   * @param {String} responseText - Raw response from Gemini
   * @returns {Object} - Parsed data object
   */
  parseGeminiResponse(responseText) {
    try {
      // Clean the response text to extract JSON
      let jsonText = responseText.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      return parsed;
      
    } catch (error) {
      logger.error('Failed to parse Gemini response:', error);
      logger.debug('Raw response:', responseText);
      
      // Return fallback structure with new format
      return {
        documentType: 'receipt',
        merchantName: { value: '', confidence: 0 },
        documentDate: { value: new Date().toISOString().split('T')[0], confidence: 0 },
        transactions: [],
        items: [],
        totals: {
          subtotal: { value: 0, confidence: 0 },
          taxAmount: { value: 0, confidence: 0 },
          totalAmount: { value: 0, confidence: 0 }
        },
        paymentInfo: {
          method: 'other',
          lastFourDigits: '',
          confidence: 0
        },
        rawText: responseText,
        confidence: 0.1
      };
    }
  }

  /**
   * Format parsed data to match expected structure
   * @param {Object} geminiData - Data from Gemini
   * @returns {Object} - Formatted data
   */
  formatParsedData(geminiData) {
    return {
      documentType: geminiData.documentType || 'receipt',
      merchantName: geminiData.merchantName || { value: '', confidence: 0 },
      documentDate: this.formatDateValue(geminiData.documentDate),
      transactions: geminiData.transactions || [],
      items: geminiData.items || [],
      totals: {
        subtotal: geminiData.totals?.subtotal || { value: 0, confidence: 0 },
        taxAmount: geminiData.totals?.taxAmount || { value: 0, confidence: 0 },
        totalAmount: geminiData.totals?.totalAmount || { value: 0, confidence: 0 }
      },
      paymentInfo: geminiData.paymentInfo || { method: 'other', lastFourDigits: '', confidence: 0 },
      rawText: geminiData.rawText || '',
      
      // Legacy fields for backward compatibility
      totalAmount: geminiData.totals?.totalAmount || geminiData.totalAmount || { value: 0, confidence: 0 },
      date: this.formatDateValue(geminiData.documentDate || geminiData.date),
      taxAmount: geminiData.totals?.taxAmount || geminiData.taxAmount || { value: 0, confidence: 0 },
      category: geminiData.category || { suggested: 'other', confidence: 0 },
      paymentMethod: geminiData.paymentInfo?.method ? { value: geminiData.paymentInfo.method, confidence: geminiData.paymentInfo.confidence } : { value: 'other', confidence: 0 },
      subtotal: geminiData.totals?.subtotal || geminiData.subtotal || { value: 0, confidence: 0 }
    };
  }

  /**
   * Format date value to Date object
   * @param {Object} dateObj - Date object from Gemini
   * @returns {Object} - Formatted date object
   */
  formatDateValue(dateObj) {
    if (!dateObj || !dateObj.value) {
      return { value: new Date(), confidence: 0 };
    }
    
    try {
      const date = new Date(dateObj.value);
      return {
        value: isNaN(date.getTime()) ? new Date() : date,
        confidence: dateObj.confidence || 0
      };
    } catch (error) {
      return { value: new Date(), confidence: 0 };
    }
  }

  /**
   * Convert PDF to image if needed
   * @param {String} filePath - Original file path
   * @returns {String} - Image file path
   */
  async convertToImageIfNeeded(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      logger.info('Converting PDF to image...');
      
      try {
        const outputPath = filePath.replace('.pdf', '_converted.png');
        
        const convert = pdf2pic.fromPath(filePath, {
          density: 300,
          saveFilename: path.basename(outputPath, '.png'),
          savePath: path.dirname(outputPath),
          format: "png",
          width: 2000,
          height: 2000
        });
        
        const result = await convert(1); // Convert first page
        return result.path;
        
      } catch (error) {
        logger.error('PDF conversion failed:', error);
        throw new Error('Failed to convert PDF to image');
      }
    }
    
    return filePath;
  }

  /**
   * Get MIME type for image
   * @param {String} filePath - File path
   * @returns {String} - MIME type
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Get empty parsed data structure
   * @returns {Object} - Empty data structure
   */
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

module.exports = new GeminiOCRService();

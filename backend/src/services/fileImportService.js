const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * File Import Service for handling CSV and Excel file imports
 */
class FileImportService {
  constructor() {
    this.supportedFormats = ['csv', 'xlsx', 'xls'];
  }

  /**
   * Process uploaded file and extract transaction data
   * @param {string} filePath - Path to the uploaded file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Processed data
   */
  async processFile(filePath, options = {}) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      switch (ext) {
        case '.csv':
          return await this.processCSV(filePath, options);
        case '.xlsx':
        case '.xls':
          return await this.processExcel(filePath, options);
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      logger.error('File processing error:', error);
      throw error;
    }
  }

  /**
   * Process CSV file
   * @param {string} filePath - Path to CSV file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed data
   */
  async processCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve({
            success: true,
            data: results,
            format: 'csv',
            recordCount: results.length
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process Excel file
   * @param {string} filePath - Path to Excel file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processed data
   */
  async processExcel(filePath, options = {}) {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      return {
        success: true,
        data: data,
        format: 'excel',
        recordCount: data.length,
        sheetName: sheetName
      };
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }

  /**
   * Validate file format
   * @param {string} filePath - Path to file
   * @returns {boolean} - Whether file is supported
   */
  isSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return this.supportedFormats.includes(ext);
  }
}

module.exports = FileImportService;
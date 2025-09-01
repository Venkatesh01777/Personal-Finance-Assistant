/**
 * Quick database connection test
 * Run: node test-connection.js
 */

require('dotenv').config();
const database = require('./src/config/database');
const logger = require('./src/utils/logger');

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Test connection
    await database.connect();
    
    // Test health check
    const health = await database.healthCheck();
    console.log('📊 Health Check:', health);
    
    // Test connection status
    const status = database.getConnectionStatus();
    console.log('🔗 Connection Status:', status);
    
    console.log('✅ Database connection test successful!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('👋 Connection closed');
    process.exit(0);
  }
};

testConnection();

#!/usr/bin/env node

/**
 * Database Management Script
 * 
 * Usage:
 * npm run db:seed    - Initialize database with default data
 * npm run db:clear   - Clear all data (development only)
 * npm run db:stats   - Show database statistics
 */

require('dotenv').config();
const database = require('./src/config/database');
const { 
  initializeDatabase, 
  clearDatabase, 
  getDatabaseStats,
  createAdminUser
} = require('./src/config/seeder');
const logger = require('./src/utils/logger');

const command = process.argv[2];

const runCommand = async () => {
  try {
    // Connect to database
    await database.connect();
    
    switch (command) {
      case 'seed':
        logger.info('🌱 Seeding database...');
        await initializeDatabase();
        logger.info('✅ Database seeded successfully!');
        break;
        
      case 'clear':
        if (process.env.NODE_ENV === 'production') {
          logger.error('❌ Cannot clear database in production environment');
          process.exit(1);
        }
        logger.info('🗑️  Clearing database...');
        await clearDatabase();
        logger.info('✅ Database cleared successfully!');
        break;
        
      case 'stats':
        logger.info('📊 Getting database statistics...');
        const stats = await getDatabaseStats();
        console.log('\n📈 Database Statistics:');
        console.log(`👥 Users: ${stats.users}`);
        console.log(`📂 Categories: ${stats.categories}`);
        console.log(`💰 Transactions: ${stats.transactions}`);
        console.log(`🧾 Receipts: ${stats.receipts}`);
        console.log(`📋 Total Records: ${stats.total}\n`);
        break;
        
      case 'admin':
        logger.info('👤 Creating admin user...');
        await createAdminUser();
        logger.info('✅ Admin user created successfully!');
        break;
        
      default:
        console.log('Available commands:');
        console.log('  seed  - Initialize database with default data');
        console.log('  clear - Clear all data (development only)');
        console.log('  stats - Show database statistics');
        console.log('  admin - Create admin user');
        break;
    }
    
  } catch (error) {
    logger.error('❌ Command failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    process.exit(0);
  }
};

runCommand();

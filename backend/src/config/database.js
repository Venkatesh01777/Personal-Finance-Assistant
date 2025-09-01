const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Get MongoDB URI from environment or use local fallback
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_tracker';
    
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Connection type:', mongoURI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('🔍 Error details:', error.message);
    
    if (error.message.includes('URI must include hostname')) {
      console.error('� Solution: Check your MongoDB URI format');
      console.error('   - For local: mongodb://localhost:27017/database_name');
      console.error('   - For Atlas: mongodb+srv://username:password@cluster.mongodb.net/database_name');
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Solution: Make sure MongoDB is running locally');
      console.error('   - Install MongoDB: https://www.mongodb.com/try/download/community');
      console.error('   - Start MongoDB service');
      console.error('   - Or use MongoDB Atlas cloud database');
    }
    
    console.error('💥 Exiting application...');
    process.exit(1);
  }
};

module.exports = connectDB;

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI_MONGODB_URI ? 'Set' : 'Not set');
    
    const mongoUri = process.env.MONGODB_URI_MONGODB_URI || 'mongodb://localhost:27017/da-orbit';
    console.log('Using MongoDB URI ending with:', mongoUri.split('/').pop());
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗃️ Database Name: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Full error:', error);
    console.error('MongoDB URI used:', process.env.MONGODB_URI_MONGODB_URI || 'mongodb://localhost:27017/da-dynamic-pages');
    process.exit(1);
  }
};

export default connectDB;
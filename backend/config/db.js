// backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Connection pooling options (performance)
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);

        // Connection events
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB error: ${err.message}`);
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });

    } catch (error) {
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        
        if (error.name === 'MongoServerError') {
            console.error('🔐 Check MongoDB credentials');
        }
        if (error.code === 'ENOTFOUND' || error.name === 'MongooseServerSelectionError') {
            console.error('🌐 Check internet connection or MongoDB URI');
        }
        
        process.exit(1);
    }
};

module.exports = connectDB;
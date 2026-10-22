/**
 * BypassFX Backend — MongoDB Connection (Mongoose)
 */

const dns = require('dns');

// Configure reliable DNS servers for SRV record lookup on Windows/development
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if custom dns servers cannot be set
}

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('⚠️  MONGO_URI is not set in .env file. Please configure your MongoDB Atlas connection.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // 5-second timeout for quick feedback
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('⚠️  MongoDB connection notice:', err.message);
    if (err.message.includes('whitelist') || err.message.includes('Could not connect to any servers')) {
      console.log('👉 Tip: Whitelist your current IP address (or 0.0.0.0/0 for everywhere) in MongoDB Atlas:');
      console.log('   Security -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0)');
    }
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
  isConnected = false;
});

mongoose.connection.on('connected', () => {
  isConnected = true;
});

module.exports = {
  connectDB,
  isDBConnected: () => isConnected
};

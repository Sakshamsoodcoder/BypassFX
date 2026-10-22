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
let retryTimer = null;

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
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    console.log(`\n✅ MongoDB connected successfully: ${conn.connection.host}\n`);
  } catch (err) {
    isConnected = false;
    console.error('⚠️  MongoDB connection notice:', err.message);
    console.log('👉 Action needed: Whitelist your IP in MongoDB Atlas Network Access:');
    console.log('   Go to: https://cloud.mongodb.com/ -> Network Access -> Add IP Address -> Allow Access From Anywhere (0.0.0.0/0)');

    // Auto-retry connection every 8 seconds so it connects as soon as IP is whitelisted
    if (!retryTimer && process.env.NODE_ENV !== 'production') {
      retryTimer = setInterval(() => {
        if (!isConnected) {
          console.log('🔄 Checking MongoDB connection again...');
          connectDB();
        } else if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      }, 8000);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
  isConnected = false;
});

mongoose.connection.on('connected', () => {
  isConnected = true;
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
});

module.exports = {
  connectDB,
  isDBConnected: () => isConnected
};

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`[DB] MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`[DB] Connection error: ${err.message}`);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[DB] MongoDB disconnected. Reconnecting...');
      isConnected = false;
      setTimeout(connectDB, 5000);
    });
  } catch (error) {
    logger.error(`[DB] Connection failed: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('[DB] MongoDB disconnected intentionally');
};

module.exports = { connectDB, disconnectDB };

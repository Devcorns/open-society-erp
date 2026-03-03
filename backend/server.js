require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`[SERVER] Society Tracker running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`[SERVER] API Base: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`[SERVER] ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('[SERVER] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error(`[UNHANDLED REJECTION] ${err.message}`);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error(`[UNCAUGHT EXCEPTION] ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    logger.error(`[SERVER] Failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();

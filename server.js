require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info(`Server started. Application disponible sur http://localhost:${port}`);
});

function gracefulShutdown(signal) {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

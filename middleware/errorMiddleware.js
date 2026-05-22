function notFound(req, res) {
  res.status(404).json({ message: 'Route introuvable.' });
}

const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  logger.error(error);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = error.statusCode || 500;
  
  let message = error.message || 'Erreur serveur.';
  if (isProduction && statusCode >= 500) {
    message = 'Une erreur interne est survenue.';
  }
  
  res.status(statusCode).json({ message });
}

module.exports = {
  notFound,
  errorHandler
};

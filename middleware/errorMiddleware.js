function notFound(req, res) {
  res.status(404).json({ message: 'Route introuvable.' });
}

const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  logger.error(error);
  // Empêcher la fuite de détails techniques ou de schéma de BDD vers le client
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Une erreur interne est survenue.' : (error.message || 'Erreur serveur.');
  
  res.status(error.statusCode || 500).json({ message });
}

module.exports = {
  notFound,
  errorHandler
};

const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Donnees invalides.',
      errors: errors.array()
    });
  }

  return next();
}

module.exports = validateRequest;

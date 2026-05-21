const authService = require('../services/authService');

function requireAdmin(req, res, next) {
  const token = req.cookies ? req.cookies[authService.cookieName] : null;
  const session = authService.verifySession(token);

  if (!session || session.role !== 'admin') {
    return res.status(401).json({ message: 'Acces admin refuse.' });
  }

  req.admin = session;
  return next();
}

module.exports = {
  requireAdmin
};

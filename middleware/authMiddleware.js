const authService = require('../services/authService');

// Les deux rôles autorisés à se connecter
const ALLOWED_ROLES = ['admin', 'controleur'];

function requireAuth(req, res, next) {
  const token   = req.cookies?.[authService.cookieName];
  const session = authService.verifySession(token);
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return res.status(401).json({ message: 'Accès refusé.' });
  }
  req.admin = session;
  return next();
}

function requireAdmin(req, res, next) {
  const token   = req.cookies?.[authService.cookieName];
  const session = authService.verifySession(token);
  if (!session || session.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé à l\'administrateur.' });
  }
  req.admin = session;
  return next();
}

// Admin ou Controleur
function requireAdminOrController(req, res, next) {
  const token   = req.cookies?.[authService.cookieName];
  const session = authService.verifySession(token);
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return res.status(401).json({ message: 'Accès refusé.' });
  }
  req.admin = session;
  return next();
}

module.exports = { requireAuth, requireAdmin, requireAdminOrController };

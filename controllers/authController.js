const authService = require('../services/authService');
const auditService = require('../services/auditService');

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    res.cookie(authService.cookieName, token, authService.getSessionCookieOptions());

    // Audit log
    await auditService.log({
      utilisateur: req.body.email || req.body.username || user.username || '',
      role: user.role,
      action: 'connexion',
      details: `Connexion réussie (${user.role})`
    });

    return res.json({ message: 'Connexion réussie.', user, token });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await authService.createUser(req.body);

    await auditService.log({
      utilisateur: req.admin?.username || 'admin',
      role: req.admin?.role || 'admin',
      action: 'creation_utilisateur',
      details: `Création du compte ${user.email} (${user.role})`
    });

    return res.status(201).json({ message: 'Compte créé avec succès.', user });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await authService.listUsers();
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    await authService.deleteUser(req.params.id);

    await auditService.log({
      utilisateur: req.admin?.username || 'admin',
      role: req.admin?.role || 'admin',
      action: 'suppression_utilisateur',
      details: `Suppression du compte id=${req.params.id}`
    });

    return res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.json({
    admin: {
      username: req.admin.username,
      role:     req.admin.role,
      nom:      req.admin.nom || req.admin.username
    }
  });
}

async function logout(req, res) {
  res.clearCookie(authService.cookieName, { path: '/' });
  return res.json({ message: 'Déconnexion réussie.' });
}

module.exports = { login, createUser, listUsers, deleteUser, me, logout };

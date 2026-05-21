const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const token = await authService.login(req.body);

    res.cookie(authService.cookieName, token, authService.getSessionCookieOptions());

    return res.json({
      message: 'Connexion admin reussie.',
      admin: {
        username: req.body.username
      }
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.json({
    admin: {
      username: req.admin.username,
      role: req.admin.role
    }
  });
}

function logout(req, res) {
  res.clearCookie(authService.cookieName, {
    path: '/'
  });

  return res.json({ message: 'Deconnexion reussie.' });
}

module.exports = {
  login,
  me,
  logout
};

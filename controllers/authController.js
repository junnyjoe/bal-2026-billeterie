const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);

    res.cookie(authService.cookieName, token, authService.getSessionCookieOptions());

    // If admin, send admin field and specific message
    if (user && user.role === 'admin') {
      return res.json({
        message: 'Connexion admin reussie.',
        user,
        admin: { username: user.username, role: user.role, nom: user.nom },
        token
      });
    }

    return res.json({
      message: 'Connexion réussie.',
      user,
      token
    });
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      user
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.json({
    admin: {
      username: req.admin.username,
      role: req.admin.role,
      nom: req.admin.nom || req.admin.username
    }
  });
}

function logout(req, res) {
  res.clearCookie(authService.cookieName, {
    path: '/'
  });

  return res.json({ message: 'deconnexion réussie.' });
}

module.exports = {
  login,
  register,
  me,
  logout
};

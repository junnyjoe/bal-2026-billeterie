const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const cookieName = 'admin_session';

async function login({ username, password }) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!expectedUsername || !passwordHash || !jwtSecret) {
    const error = new Error('Authentification admin non configuree.');
    error.statusCode = 500;
    throw error;
  }

  const usernameMatches = username === expectedUsername;
  const passwordMatches = await bcrypt.compare(password, passwordHash);

  if (!usernameMatches || !passwordMatches) {
    const error = new Error('Identifiants admin invalides.');
    error.statusCode = 401;
    throw error;
  }

  return jwt.sign(
    {
      role: 'admin',
      username
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    }
  );
}

function verifySession(token) {
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function parseJwtExpiry(exp) {
  const value = parseInt(exp);

  if (exp.includes('d')) return value * 24 * 60 * 60 * 1000;
  if (exp.includes('h')) return value * 60 * 60 * 1000;
  if (exp.includes('m')) return value * 60 * 1000;

  return value * 1000;
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: parseJwtExpiry(process.env.JWT_EXPIRES_IN || '8h'),
    path: '/'
  };
}

module.exports = {
  cookieName,
  login,
  verifySession,
  getSessionCookieOptions
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const cookieName = 'admin_session';

// ── Login : supporte admin (.env) + utilisateurs (Supabase) ─────────────────
async function login({ email, password, username }) {
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  if (!jwtSecret) {
    const error = new Error('Authentification non configurée.');
    error.statusCode = 500;
    throw error;
  }

  // Compatibilité : si le frontend envoie "username" au lieu de "email"
  const loginIdentifier = email || username;

  // 1. Vérifier d'abord si c'est le compte admin (.env)
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (expectedUsername && adminPasswordHash) {
    const isAdminUsername = (loginIdentifier === expectedUsername || loginIdentifier === expectedEmail);
    if (isAdminUsername) {
      const passwordMatches = await bcrypt.compare(password, adminPasswordHash);
      if (passwordMatches) {
        const token = jwt.sign(
          { role: 'admin', username: expectedUsername, nom: 'Administrateur' },
          jwtSecret,
          { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );
        return { token, user: { role: 'admin', username: expectedUsername, nom: 'Administrateur' } };
      } else {
        const error = new Error('Identifiants invalides.');
        error.statusCode = 401;
        throw error;
      }
    }
  }

  // 2. Sinon chercher dans la table users (Supabase)
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, nom, email, password_hash, role')
    .eq('email', loginIdentifier)
    .maybeSingle();

  if (dbError) throw dbError;

  if (!user) {
    const error = new Error('Identifiants invalides.');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    const error = new Error('Identifiants invalides.');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { role: user.role, username: user.email, nom: user.nom, userId: user.id },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return { token, user: { role: user.role, nom: user.nom } };
}

// ── Register : créer un compte participant ──────────────────────────────────
async function register({ nom, telephone, email, password }) {
  if (!nom || !email || !password) {
    const error = new Error('Nom, email et mot de passe sont obligatoires.');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Le mot de passe doit contenir au moins 8 caractères.');
    error.statusCode = 400;
    throw error;
  }

  // Vérifier si l'email existe déjà
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    const error = new Error('Un compte avec cet email existe déjà.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: user, error: dbError } = await supabase
    .from('users')
    .insert({
      nom: nom.trim(),
      telephone: (telephone || '').trim() || null,
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role: 'participant'
    })
    .select('id, nom, email, role')
    .single();

  if (dbError) {
    if (dbError.code === '23505') {
      const error = new Error('Un compte avec cet email existe déjà.');
      error.statusCode = 409;
      throw error;
    }
    throw dbError;
  }

  return user;
}

// ── Vérification de session ─────────────────────────────────────────────────
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
  register,
  verifySession,
  getSessionCookieOptions
};

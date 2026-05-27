const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../config/db');

const cookieName = 'admin_session';

// ── Login : admin (.env) ou controleur (Supabase) ─────────────────────────
async function login({ email, password, username }) {
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';
  const loginIdentifier = (email || username || '').trim().toLowerCase();

  // 1. Vérifier compte admin .env
  const expectedUsername   = process.env.ADMIN_USERNAME;
  const adminPasswordHash  = process.env.ADMIN_PASSWORD_HASH;

  if (expectedUsername && adminPasswordHash) {
    const isAdmin = loginIdentifier === expectedUsername.toLowerCase();
    if (isAdmin) {
      const ok = await bcrypt.compare(password, adminPasswordHash);
      if (!ok) { throwUnauthorized(); }
      const token = signToken({ role: 'admin', username: expectedUsername, nom: 'Administrateur' }, jwtSecret);
      return { token, user: { role: 'admin', username: expectedUsername, nom: 'Administrateur' } };
    }
  }

  // 2. Chercher dans la table users (controleurs)
  const { data: user, error } = await supabase
    .from('users')
    .select('id, nom, email, password_hash, role')
    .eq('email', loginIdentifier)
    .maybeSingle();

  if (error) throw error;
  if (!user) throwUnauthorized();

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throwUnauthorized();

  const token = signToken({ role: user.role, username: user.email, nom: user.nom, userId: user.id }, jwtSecret);
  return { token, user: { role: user.role, nom: user.nom } };
}

// ── Créer un utilisateur (admin ou controleur) ─────────────────────────────
async function createUser({ nom, email, password, role }) {
  const allowedRoles = ['admin', 'controleur'];
  if (!nom || !email || !password) {
    const e = new Error('Nom, email et mot de passe sont obligatoires.'); e.statusCode = 400; throw e;
  }
  if (!allowedRoles.includes(role)) {
    const e = new Error('Rôle invalide (admin ou controleur).'); e.statusCode = 400; throw e;
  }

  const { data: existing } = await supabase.from('users').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (existing) {
    const e = new Error('Un compte avec cet email existe déjà.'); e.statusCode = 409; throw e;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { data: created, error } = await supabase
    .from('users')
    .insert({ nom: nom.trim(), email: email.trim().toLowerCase(), password_hash: passwordHash, role })
    .select('id, nom, email, role, created_at')
    .single();

  if (error) throw error;
  return created;
}

// ── Lister les utilisateurs ────────────────────────────────────────────────
async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nom, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ── Désactiver / Supprimer un utilisateur ────────────────────────────────-
async function deleteUser(userId) {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
  return true;
}

// ── Vérification de session ────────────────────────────────────────────────
function verifySession(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
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

// ── Helpers ────────────────────────────────────────────────────────────────
function throwUnauthorized() {
  const e = new Error('Identifiants invalides.'); e.statusCode = 401; throw e;
}

function signToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function parseJwtExpiry(exp) {
  const value = parseInt(exp);
  if (exp.includes('d')) return value * 24 * 60 * 60 * 1000;
  if (exp.includes('h')) return value * 60 * 60 * 1000;
  if (exp.includes('m')) return value * 60 * 1000;
  return value * 1000;
}

module.exports = { cookieName, login, createUser, listUsers, deleteUser, verifySession, getSessionCookieOptions };

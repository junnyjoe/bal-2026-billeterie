/**
 * Tests d'intégration — Authentification Admin
 *
 * Couvre :
 *  ✅ Login admin (credentials valides)
 *  ✅ Login refusé (mauvais username)
 *  ✅ Login refusé (mauvais password)
 *  ✅ Login refusé (champs manquants / validation)
 *  ✅ Cookie JWT posé après login
 *  ✅ GET /api/auth/me protégé (avec et sans cookie)
 *  ✅ POST /api/auth/logout (suppression cookie)
 */

const bcrypt = require('bcryptjs');

// ── Env vars de test (AVANT tout require applicatif) ──────────────────────────
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'Str0ngP@ssword!';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
const TEST_JWT_SECRET = 'integration-test-jwt-secret-long-enough-32chars';

process.env.ADMIN_USERNAME = TEST_USERNAME;
process.env.ADMIN_PASSWORD_HASH = TEST_HASH;
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.JWT_EXPIRES_IN = '1h';
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
process.env.NODE_ENV = 'test';

// ── Mock Supabase (on ne veut pas toucher la vraie BDD) ───────────────────────
jest.mock('../../config/db', () => {
  const mockFrom = () => ({
    insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    select: () => ({
      eq: () => ({
        maybeSingle: () => ({ data: null, error: null }),
        select: () => ({ data: [], error: null })
      }),
      order: () => ({ data: [], error: null })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({ maybeSingle: () => ({ data: null, error: null }) }),
        eq: () => ({ select: () => ({ data: [], error: null }) })
      })
    })
  });
  return { from: mockFrom };
});

const request = require('supertest');
const app = require('../../app');

// ═══════════════════════════════════════════════════════════════════════════════
// 1 — LOGIN ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  test('✅ Connexion réussie avec identifiants valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Connexion admin reussie.');
    expect(res.body.admin.username).toBe(TEST_USERNAME);

    // Vérifie que le cookie admin_session est posé
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('admin_session='))).toBe(true);
  });

  test('❌ Refusé — mauvais nom d\'utilisateur', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hacker', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalides/i);
  });

  test('❌ Refusé — mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalides/i);
  });

  test('❌ Refusé — champs manquants (validation express-validator)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '', password: '' });

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Donnees invalides.');
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
  });

  test('❌ Refusé — mot de passe trop court (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: 'short' });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — COOKIE JWT & SESSION
// ═══════════════════════════════════════════════════════════════════════════════
describe('Cookie JWT & Session admin', () => {
  let adminCookie;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    // Extraire le cookie pour les requêtes suivantes
    adminCookie = loginRes.headers['set-cookie']
      .find(c => c.startsWith('admin_session='));
  });

  test('✅ GET /api/auth/me — retourne les infos admin avec cookie valide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.admin.username).toBe(TEST_USERNAME);
    expect(res.body.admin.role).toBe('admin');
  });

  test('❌ GET /api/auth/me — 401 sans cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/refuse/i);
  });

  test('❌ GET /api/auth/me — 401 avec cookie invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'admin_session=invalid.jwt.token');

    expect(res.status).toBe(401);
  });

  test('✅ POST /api/auth/logout — supprime le cookie de session', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deconnexion/i);

    // Le cookie doit être vidé (Max-Age=0 ou Expires dans le passé)
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /health', () => {
  test('✅ Retourne { status: "ok" }', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — ROUTES PROTÉGÉES SANS AUTH
// ═══════════════════════════════════════════════════════════════════════════════
describe('Routes protégées — accès sans authentification', () => {
  test('❌ GET /api/tickets → 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });

  test('❌ GET /api/stats → 401', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });

  test('❌ POST /api/scan → 401', async () => {
    const res = await request(app)
      .post('/api/scan')
      .send({ code: 'ABCD1234' });
    expect(res.status).toBe(401);
  });

  test('❌ PUT /api/ticket/ABCD1234 → 401', async () => {
    const res = await request(app)
      .put('/api/ticket/ABCD1234')
      .send({ nom: 'Test', telephone: '0600000000', statut: 'active' });
    expect(res.status).toBe(401);
  });
});

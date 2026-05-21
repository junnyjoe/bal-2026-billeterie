/**
 * Tests d'intégration — Tickets (création, scan QR, collision, validation statut)
 *
 * Couvre :
 *  ✅ Création de ticket (POST /api/register)
 *  ✅ Validation des champs obligatoires
 *  ✅ Scan QR — ticket valide (POST /api/scan)
 *  ✅ Scan QR — ticket déjà utilisé (collision)
 *  ✅ Scan QR — ticket introuvable
 *  ✅ Scan QR — extraction du code depuis une URL complète
 *  ✅ Validation statut — GET /api/ticket/:code
 *  ✅ Modification ticket — PUT /api/ticket/:code
 *  ✅ Liste tickets — GET /api/tickets
 *  ✅ Statistiques — GET /api/stats
 */

const bcrypt = require('bcryptjs');

// ── Env vars de test ──────────────────────────────────────────────────────────
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'Str0ngP@ssword!';

process.env.ADMIN_USERNAME = TEST_USERNAME;
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.JWT_SECRET = 'integration-test-jwt-secret-long-enough-32chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.APP_BASE_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';
process.env.NODE_ENV = 'test';

// ── Mock Supabase — couche repository simulée ─────────────────────────────────
// On simule une base en mémoire pour les tests d'intégration
const inMemoryDb = [];
let autoId = 1;

jest.mock('../../config/db', () => {
  // Helpers pour simuler l'API Supabase chainée
  function createChainedResponse(data, error = null) {
    return { data, error };
  }

  const mockSupabase = {
    from: (table) => ({
      // INSERT
      insert: (row) => ({
        select: () => ({
          single: () => {
            // Vérifier les doublons sur ticket_code
            const exists = inMemoryDb.find(r => r.ticket_code === row.ticket_code);
            if (exists) {
              return createChainedResponse(null, { code: 'ER_DUP_ENTRY', message: 'duplicate' });
            }

            const newRow = {
              id: autoId++,
              nom: row.nom,
              telephone: row.telephone,
              email: row.email || null,
              ticket_code: row.ticket_code,
              qr_code: row.qr_code,
              statut: 'active',
              date_achat: new Date().toISOString(),
              date_scan: null
            };
            inMemoryDb.push(newRow);
            return createChainedResponse(newRow);
          }
        })
      }),

      // SELECT
      select: (columns) => {
        const chain = {
          eq: (field, value) => ({
            maybeSingle: () => {
              const found = inMemoryDb.find(r => r[field] === value);
              return createChainedResponse(found || null);
            },
            // Pour markTicketAsUsed qui chaîne deux .eq()
            eq: (field2, value2) => ({
              select: () => ({
                data: inMemoryDb.filter(r => r[field] === value && r[field2] === value2),
                error: null
              })
            }),
            select: () => ({
              maybeSingle: () => {
                const found = inMemoryDb.find(r => r[field] === value);
                return createChainedResponse(found || null);
              }
            })
          }),
          order: () => {
            return createChainedResponse([...inMemoryDb]);
          }
        };
        // Pour getStats qui fait select sans eq
        chain.data = [...inMemoryDb];
        chain.error = null;
        return chain;
      },

      // UPDATE
      update: (updates) => ({
        eq: (field, value) => {
          const idx = inMemoryDb.findIndex(r => r[field] === value);
          if (idx !== -1) {
            Object.assign(inMemoryDb[idx], updates);
          }

          return {
            select: () => ({
              maybeSingle: () => {
                return createChainedResponse(idx !== -1 ? inMemoryDb[idx] : null);
              }
            }),
            // Pour markTicketAsUsed qui chaîne .eq().eq().select()
            eq: (field2, value2) => ({
              select: () => {
                // Vérifier la double condition
                const row = inMemoryDb.find(r => r[field] === value && r[field2] === value2);
                if (row) {
                  Object.assign(row, updates);
                  return createChainedResponse([row]);
                }
                return createChainedResponse([]);
              }
            })
          };
        }
      })
    })
  };

  return mockSupabase;
});

// Mock le qrGenerator pour éviter la génération réelle
jest.mock('../../services/qrGenerator', () => ({
  generateQrCode: jest.fn().mockResolvedValue('data:image/png;base64,TESTQR_INTEGRATION')
}));

const request = require('supertest');
const app = require('../../app');

// ── Helper : obtenir le cookie admin ──────────────────────────────────────────
async function loginAdmin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: TEST_USERNAME, password: TEST_PASSWORD });
  return res.headers['set-cookie'].find(c => c.startsWith('admin_session='));
}

// Nettoyer la BDD en mémoire entre chaque test
beforeEach(() => {
  inMemoryDb.length = 0;
  autoId = 1;
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1 — CRÉATION DE TICKET (POST /api/register)
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/register — Création de ticket', () => {
  test('✅ Crée un ticket avec les champs obligatoires', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        nom: 'Jean Dupont',
        telephone: '0612345678'
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/enregistre/i);
    expect(res.body.ticket).toEqual(expect.objectContaining({
      nom: 'Jean Dupont',
      telephone: '0612345678',
      statut: 'active'
    }));
    expect(res.body.ticket.ticketCode).toBeDefined();
    expect(res.body.ticket.qrCode).toBeDefined();
    expect(res.body.ticket.dateAchat).toBeDefined();
  });

  test('✅ Crée un ticket avec email optionnel', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        nom: 'Marie Curie',
        telephone: '0699887766',
        email: 'marie@example.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.ticket.email).toBe('marie@example.com');
  });

  test('❌ Refusé — nom manquant', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ telephone: '0612345678' });

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Donnees invalides.');
  });

  test('❌ Refusé — téléphone manquant', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ nom: 'Jean Dupont' });

    expect(res.status).toBe(422);
  });

  test('❌ Refusé — nom trop court (< 2 chars)', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ nom: 'X', telephone: '0612345678' });

    expect(res.status).toBe(422);
  });

  test('❌ Refusé — email invalide', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ nom: 'Jean', telephone: '0612345678', email: 'pas-un-email' });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — SCAN QR (POST /api/scan)
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/scan — Scan QR', () => {
  let adminCookie;

  beforeEach(async () => {
    adminCookie = await loginAdmin();
  });

  test('✅ Scan valide — marque le ticket comme utilisé', async () => {
    // D'abord créer un ticket
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Alice Martin', telephone: '0611223344' });

    const ticketCode = createRes.body.ticket.ticketCode;

    // Scanner le ticket
    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: ticketCode });

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.valid).toBe(true);
    expect(scanRes.body.message).toMatch(/validee/i);
    expect(scanRes.body.ticket.statut).toBe('used');
  });

  test('✅ Scan via URL complète — extrait le code automatiquement', async () => {
    // Créer un ticket
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Bob URL', telephone: '0622334455' });

    const ticketCode = createRes.body.ticket.ticketCode;
    const fullUrl = `http://localhost:3000/ticket.html?code=${ticketCode}`;

    // Scanner avec l'URL complète (comme un vrai scan QR)
    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: fullUrl });

    expect(scanRes.status).toBe(200);
    expect(scanRes.body.valid).toBe(true);
    expect(scanRes.body.ticket.ticketCode).toBe(ticketCode);
  });

  test('❌ Scan ticket introuvable → 404', async () => {
    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: 'NEXISTEPAS' });

    expect(scanRes.status).toBe(404);
    expect(scanRes.body.valid).toBe(false);
    expect(scanRes.body.message).toMatch(/introuvable/i);
  });

  test('❌ Scan ticket déjà utilisé (collision) → 409', async () => {
    // Créer et scanner un ticket une première fois
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Charlie Double', telephone: '0633445566' });

    const ticketCode = createRes.body.ticket.ticketCode;

    // Premier scan → OK
    await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: ticketCode });

    // Deuxième scan → COLLISION
    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: ticketCode });

    expect(scanRes.status).toBe(409);
    expect(scanRes.body.valid).toBe(false);
    expect(scanRes.body.message).toMatch(/deja utilise/i);
    expect(scanRes.body.ticket).toBeDefined();
  });

  test('❌ Scan sans code → 422 (validation)', async () => {
    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({});

    expect(scanRes.status).toBe(422);
  });

  test('❌ Scan sans authentification → 401', async () => {
    const scanRes = await request(app)
      .post('/api/scan')
      .send({ code: 'ABCD1234' });

    expect(scanRes.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — COLLISION TICKET (unicité ticket_code)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Collision ticket_code', () => {
  test('✅ Chaque ticket créé a un code unique', async () => {
    const codes = new Set();

    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/register')
        .send({ nom: `Participant ${i}`, telephone: `060000000${i}` });

      expect(res.status).toBe(201);
      const code = res.body.ticket.ticketCode;
      expect(codes.has(code)).toBe(false);
      codes.add(code);
    }

    expect(codes.size).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — VALIDATION STATUT (GET /api/ticket/:code)
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/ticket/:code — Validation de statut', () => {
  test('✅ Ticket actif retourne statut "active"', async () => {
    // Créer un ticket
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Diana Active', telephone: '0644556677' });

    const ticketCode = createRes.body.ticket.ticketCode;

    const res = await request(app)
      .get(`/api/ticket/${ticketCode}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket.statut).toBe('active');
    expect(res.body.ticket.ticketCode).toBe(ticketCode);
  });

  test('✅ Ticket scanné retourne statut "used"', async () => {
    const adminCookie = await loginAdmin();

    // Créer + scanner
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Eve Used', telephone: '0655667788' });

    const ticketCode = createRes.body.ticket.ticketCode;

    await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: ticketCode });

    // Vérifier le statut
    const res = await request(app)
      .get(`/api/ticket/${ticketCode}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket.statut).toBe('used');
    expect(res.body.ticket.dateScan).toBeDefined();
  });

  test('❌ Ticket introuvable → 404', async () => {
    const res = await request(app)
      .get('/api/ticket/INTROUVABLE99');

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/introuvable/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5 — MODIFICATION TICKET (PUT /api/ticket/:code)
// ═══════════════════════════════════════════════════════════════════════════════
describe('PUT /api/ticket/:code — Modification', () => {
  let adminCookie;

  beforeEach(async () => {
    adminCookie = await loginAdmin();
  });

  test('✅ Modifie le nom et le téléphone d\'un ticket', async () => {
    // Créer un ticket
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Original Name', telephone: '0600000001' });

    const ticketCode = createRes.body.ticket.ticketCode;

    const res = await request(app)
      .put(`/api/ticket/${ticketCode}`)
      .set('Cookie', adminCookie)
      .send({
        nom: 'Nom Modifié',
        telephone: '0699999999',
        statut: 'active'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/modifie/i);
    expect(res.body.ticket.nom).toBe('Nom Modifié');
    expect(res.body.ticket.telephone).toBe('0699999999');
  });

  test('❌ Modification sans authentification → 401', async () => {
    const res = await request(app)
      .put('/api/ticket/ABCD1234')
      .send({ nom: 'Test', telephone: '0600000000', statut: 'active' });

    expect(res.status).toBe(401);
  });

  test('❌ Statut invalide → 422', async () => {
    const createRes = await request(app)
      .post('/api/register')
      .send({ nom: 'Statut Test', telephone: '0600000002' });

    const ticketCode = createRes.body.ticket.ticketCode;

    const res = await request(app)
      .put(`/api/ticket/${ticketCode}`)
      .set('Cookie', adminCookie)
      .send({
        nom: 'Statut Test',
        telephone: '0600000002',
        statut: 'INVALIDE'
      });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6 — LISTE TICKETS & STATS (GET /api/tickets, GET /api/stats)
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/tickets & GET /api/stats — Liste & Statistiques', () => {
  let adminCookie;

  beforeEach(async () => {
    adminCookie = await loginAdmin();
  });

  test('✅ Liste des tickets retourne un tableau', async () => {
    // Créer 2 tickets
    await request(app).post('/api/register').send({ nom: 'A', telephone: '060000001A' });
    await request(app).post('/api/register').send({ nom: 'B', telephone: '060000002B' });

    const res = await request(app)
      .get('/api/tickets')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.tickets).toBeInstanceOf(Array);
    expect(res.body.tickets.length).toBe(2);
  });

  test('✅ Statistiques retournent les compteurs', async () => {
    // Créer 3 tickets
    await request(app).post('/api/register').send({ nom: 'S1', telephone: '0600000010' });
    await request(app).post('/api/register').send({ nom: 'S2', telephone: '0600000020' });
    await request(app).post('/api/register').send({ nom: 'S3', telephone: '0600000030' });

    // Scanner 1 ticket
    const ticketCode = inMemoryDb[0].ticket_code;
    await request(app)
      .post('/api/scan')
      .set('Cookie', adminCookie)
      .send({ code: ticketCode });

    const res = await request(app)
      .get('/api/stats')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual(expect.objectContaining({
      total: 3,
      actifs: expect.any(Number),
      utilises: expect.any(Number)
    }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7 — ROUTE INTROUVABLE
// ═══════════════════════════════════════════════════════════════════════════════
describe('Route introuvable', () => {
  test('❌ GET /api/inexistante → 404', async () => {
    const res = await request(app).get('/api/inexistante');
    expect(res.status).toBe(404);
  });
});

// tests/api.test.js
const request = require('supertest');
const app = require('../app');
const bcrypt = require('bcryptjs');

// Mock ticketService to bypass DB for E2E tests
jest.mock('../services/ticketService', () => ({
  registerParticipant: async (payload, opts) => ({ ticketCode: 'MOCKCODE', code: 'MOCKCODE' }),
  listTickets: async () => [{ ticketCode: 'MOCKCODE' }],
  validateTicketEntry: async (code) => ({ status: 'validated', ticket: { ticketCode: code } }),
  getStats: async () => ({ total: 0, actifs: 0, utilises: 0, annules: 0, ventesJour: 0 })
}));
const { generateQrCode } = require('../utils/qrGenerator');
jest.mock('../utils/qrGenerator', () => ({
  generateQrCode: async () => 'data:image/png;base64,mocked'
}));

// Mock Supabase client – not used because ticketService is mocked above
jest.mock('../config/db', () => {
  const mockChain = {
    select: () => mockChain,
    eq: () => mockChain,
    order: () => mockChain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    insert: () => mockChain,
    update: () => mockChain,
    delete: () => mockChain,
  };
  return { from: () => mockChain };
});

// Increase Jest timeout for async operations
jest.setTimeout(30000);



// Set required env vars for tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

// Helper to generate random participant data
function randomString(length) {
  return Math.random().toString(36).substring(2, 2 + length);
}

describe('API End-to-End Tests', () => {
  let adminToken = null;
  const adminCredentials = { username: process.env.ADMIN_USERNAME, password: 'admin123' }; // placeholder password

  test('Public participant registration', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({
        nom: 'Test Participant ' + randomString(5),
        telephone: '0123456789',
        email: `test_${randomString(5)}@example.com`
      })
      .expect(201);
    expect(res.body).toHaveProperty('ticket');
  });

  test('Admin login (if credentials correct)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(adminCredentials)
      .expect(200);
    expect(res.body).toHaveProperty('user');
    adminToken = res.body.token;
  });

  test('Get tickets (admin)', async () => {
    if (!adminToken) return; // skip if login failed
    const res = await request(app)
      .get('/api/tickets')
      .set('Cookie', `admin_session=${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body.tickets)).toBe(true);
  });

  test('Scan ticket (admin)', async () => {
    if (!adminToken) return;
    // First register a participant to obtain a ticket code
    const registerRes = await request(app)
      .post('/api/register')
      .send({
        nom: 'Scannable User ' + randomString(5),
        telephone: '0123456789',
        email: `scan_${randomString(5)}@example.com`
      })
      .expect(201);
    const ticket = registerRes.body.ticket;
    const code = ticket.ticketCode; // use ticketCode from response

    const scanRes = await request(app)
      .post('/api/scan')
      .set('Cookie', `admin_session=${adminToken}`)
      .send({ code })
      .expect(200);
    expect(scanRes.body).toHaveProperty('valid');
  });
});

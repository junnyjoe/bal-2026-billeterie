const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Set env vars BEFORE requiring authService, because it reads them at call-time
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin12345';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
const TEST_JWT_SECRET = 'test-jwt-secret-very-long-string';

beforeEach(() => {
  process.env.ADMIN_USERNAME = TEST_USERNAME;
  process.env.ADMIN_PASSWORD_HASH = TEST_HASH;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = '1h';
});

afterEach(() => {
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

// Require after env setup helpers are in place
const authService = require('../../services/authService');

describe('authService.login', () => {
  test('should return a valid JWT on correct credentials', async () => {
    const token = await authService.login({
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });

    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, TEST_JWT_SECRET);
    expect(decoded.username).toBe(TEST_USERNAME);
    expect(decoded.role).toBe('admin');
  });

  test('should reject invalid username', async () => {
    await expect(
      authService.login({ username: 'wrong', password: TEST_PASSWORD })
    ).rejects.toThrow('Identifiants admin invalides.');
  });

  test('should reject invalid password', async () => {
    await expect(
      authService.login({ username: TEST_USERNAME, password: 'wrongpassword' })
    ).rejects.toThrow('Identifiants admin invalides.');
  });

  test('should throw 500 if env vars are missing', async () => {
    delete process.env.ADMIN_USERNAME;

    await expect(
      authService.login({ username: 'admin', password: 'test' })
    ).rejects.toThrow('Authentification admin non configuree.');
  });
});

describe('authService.verifySession', () => {
  test('should return decoded payload for a valid token', () => {
    const token = jwt.sign({ role: 'admin', username: 'admin' }, TEST_JWT_SECRET, { expiresIn: '1h' });

    const result = authService.verifySession(token);

    expect(result).not.toBeNull();
    expect(result.role).toBe('admin');
    expect(result.username).toBe('admin');
  });

  test('should return null for an invalid token', () => {
    const result = authService.verifySession('invalid-token');
    expect(result).toBeNull();
  });

  test('should return null for an expired token', () => {
    const token = jwt.sign({ role: 'admin', username: 'admin' }, TEST_JWT_SECRET, { expiresIn: '0s' });

    const result = authService.verifySession(token);
    expect(result).toBeNull();
  });

  test('should return null if no token is provided', () => {
    expect(authService.verifySession(null)).toBeNull();
    expect(authService.verifySession(undefined)).toBeNull();
  });
});

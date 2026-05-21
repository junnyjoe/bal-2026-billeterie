const generateTicketCode = require('../../utils/generateTicketCode');

describe('generateTicketCode', () => {
  test('should return an 8-character hex string', () => {
    const code = generateTicketCode();
    expect(code).toMatch(/^[A-F0-9]{8}$/);
  });

  test('should return uppercase characters only', () => {
    const code = generateTicketCode();
    expect(code).toBe(code.toUpperCase());
  });

  test('should generate unique codes (collision test)', () => {
    const codes = new Set();
    const iterations = 10_000;

    for (let i = 0; i < iterations; i++) {
      codes.add(generateTicketCode());
    }

    // With 4 bytes of randomness (2^32 possibilities),
    // 10 000 codes should all be unique
    expect(codes.size).toBe(iterations);
  });
});

// Mock the repository layer so we don't hit Supabase
jest.mock('../../repositories/userRepository');
jest.mock('../../utils/qrGenerator', () => ({
  generateQrCode: jest.fn().mockResolvedValue('data:image/png;base64,FAKEQR')
}));

const userRepository = require('../../repositories/userRepository');
const ticketService = require('../../services/ticketService');

// --- Helpers ---
function makeFakeRow(overrides = {}) {
  return {
    id: 1,
    nom: 'Jean Dupont',
    telephone: '0612345678',
    email: 'jean@test.com',
    ticket_code: 'ABCD1234',
    qr_code: 'data:image/png;base64,FAKEQR',
    statut: 'active',
    date_achat: '2026-01-01T00:00:00Z',
    date_scan: null,
    ...overrides
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// 1. Création de ticket
// ============================================================
describe('ticketService.registerParticipant', () => {
  test('should create a ticket and return normalized data', async () => {
    const fakeRow = makeFakeRow();
    userRepository.createParticipant.mockResolvedValue(fakeRow);

    const result = await ticketService.registerParticipant(
      { nom: 'Jean Dupont', telephone: '0612345678', email: 'jean@test.com' },
      { baseUrl: 'http://localhost:3000' }
    );

    expect(userRepository.createParticipant).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.objectContaining({
      nom: 'Jean Dupont',
      telephone: '0612345678',
      email: 'jean@test.com',
      statut: 'active'
    }));
    // Normalized keys (camelCase)
    expect(result).toHaveProperty('ticketCode');
    expect(result).toHaveProperty('qrCode');
    expect(result).toHaveProperty('dateAchat');
  });

  test('should retry on duplicate key collision up to 5 times', async () => {
    const dupError = new Error('duplicate');
    dupError.code = 'ER_DUP_ENTRY';

    userRepository.createParticipant
      .mockRejectedValueOnce(dupError)
      .mockRejectedValueOnce(dupError)
      .mockResolvedValueOnce(makeFakeRow());

    const result = await ticketService.registerParticipant(
      { nom: 'Test', telephone: '0600000000' },
      { baseUrl: 'http://localhost:3000' }
    );

    expect(userRepository.createParticipant).toHaveBeenCalledTimes(3);
    expect(result).not.toBeNull();
  });

  test('should throw after 5 consecutive duplicate collisions', async () => {
    const dupError = new Error('duplicate');
    dupError.code = 'ER_DUP_ENTRY';

    userRepository.createParticipant.mockRejectedValue(dupError);

    await expect(
      ticketService.registerParticipant(
        { nom: 'Test', telephone: '0600000000' },
        { baseUrl: 'http://localhost:3000' }
      )
    ).rejects.toThrow('duplicate');

    expect(userRepository.createParticipant).toHaveBeenCalledTimes(5);
  });

  test('should throw immediately for non-duplicate errors', async () => {
    const otherError = new Error('connection refused');
    otherError.code = 'ECONNREFUSED';

    userRepository.createParticipant.mockRejectedValue(otherError);

    await expect(
      ticketService.registerParticipant(
        { nom: 'Test', telephone: '0600000000' },
        { baseUrl: 'http://localhost:3000' }
      )
    ).rejects.toThrow('connection refused');

    expect(userRepository.createParticipant).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 2. Scan QR / Validation d'entrée
// ============================================================
describe('ticketService.validateTicketEntry', () => {
  test('should return not_found for unknown code', async () => {
    userRepository.findByTicketCode.mockResolvedValue(null);

    const result = await ticketService.validateTicketEntry('UNKNOWN');

    expect(result.status).toBe('not_found');
    expect(result.ticket).toBeNull();
  });

  test('should return already_used for a used ticket', async () => {
    userRepository.findByTicketCode.mockResolvedValue(
      makeFakeRow({ statut: 'used', date_scan: '2026-01-01T12:00:00Z' })
    );

    const result = await ticketService.validateTicketEntry('ABCD1234');

    expect(result.status).toBe('already_used');
    expect(result.ticket.statut).toBe('used');
    // Should NOT have called markTicketAsUsed
    expect(userRepository.markTicketAsUsed).not.toHaveBeenCalled();
  });

  test('should validate an active ticket and mark it as used', async () => {
    const activeRow = makeFakeRow({ statut: 'active' });
    const usedRow = makeFakeRow({ statut: 'used', date_scan: '2026-01-01T12:00:00Z' });

    userRepository.findByTicketCode
      .mockResolvedValueOnce(activeRow)   // first call: lookup
      .mockResolvedValueOnce(usedRow);    // second call: after markAsUsed
    userRepository.markTicketAsUsed.mockResolvedValue(true);

    const result = await ticketService.validateTicketEntry('ABCD1234');

    expect(result.status).toBe('validated');
    expect(result.ticket.statut).toBe('used');
    expect(userRepository.markTicketAsUsed).toHaveBeenCalledWith('ABCD1234');
  });

  test('should extract ticket code from a full URL (QR scan)', async () => {
    const activeRow = makeFakeRow({ statut: 'active', ticket_code: 'ABCD1234' });
    const usedRow = makeFakeRow({ statut: 'used', ticket_code: 'ABCD1234' });

    userRepository.findByTicketCode
      .mockResolvedValueOnce(activeRow)
      .mockResolvedValueOnce(usedRow);
    userRepository.markTicketAsUsed.mockResolvedValue(true);

    const result = await ticketService.validateTicketEntry(
      'http://localhost:3000/ticket.html?code=ABCD1234'
    );

    expect(result.status).toBe('validated');
    // The repository should have been called with the extracted code, not the full URL
    expect(userRepository.findByTicketCode).toHaveBeenCalledWith('ABCD1234');
  });
});

// ============================================================
// 3. Validation de statut
// ============================================================
describe('ticketService.getTicketByCode', () => {
  test('should return normalized ticket for a valid code', async () => {
    userRepository.findByTicketCode.mockResolvedValue(makeFakeRow());

    const result = await ticketService.getTicketByCode('ABCD1234');

    expect(result).toEqual(expect.objectContaining({
      ticketCode: 'ABCD1234',
      statut: 'active'
    }));
  });

  test('should return null for unknown code', async () => {
    userRepository.findByTicketCode.mockResolvedValue(null);

    const result = await ticketService.getTicketByCode('UNKNOWN');

    expect(result).toBeNull();
  });
});

describe('ticketService.listTickets', () => {
  test('should return an array of normalized tickets', async () => {
    userRepository.listParticipants.mockResolvedValue([
      makeFakeRow({ ticket_code: 'AAA11111', statut: 'active' }),
      makeFakeRow({ ticket_code: 'BBB22222', statut: 'used' })
    ]);

    const result = await ticketService.listTickets();

    expect(result).toHaveLength(2);
    expect(result[0].ticketCode).toBe('AAA11111');
    expect(result[1].statut).toBe('used');
  });
});

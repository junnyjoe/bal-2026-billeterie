const userRepository = require('../repositories/userRepository');
const generateTicketCode = require('../utils/generateTicketCode');
const { generateQrCode } = require('../utils/qrGenerator');

function normalizeTicket(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone,
    email: row.email,
    ticketCode: row.ticket_code,
    qrCode: row.qr_code,
    statut: row.statut,
    dateAchat: row.date_achat,
    dateScan: row.date_scan
  };
}

async function registerParticipant(payload, options = {}) {
  const participantData = sanitizeParticipant(payload);
  let participant = null;
  let attempts = 0;

  while (!participant && attempts < 5) {
    attempts += 1;
    const ticketCode = generateTicketCode();
    const ticketUrl = `${options.baseUrl}/ticket.html?code=${encodeURIComponent(ticketCode)}`;
    const qrCode = await generateQrCode(ticketUrl);

    try {
      participant = await userRepository.createParticipant({
        ...participantData,
        ticketCode,
        qrCode
      });
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY' || attempts >= 5) {
        throw error;
      }
    }
  }

  return normalizeTicket(participant);
}

async function listTickets() {
  const tickets = await userRepository.listParticipants();

  return tickets.map(normalizeTicket);
}

async function getTicketByCode(code) {
  const ticket = await userRepository.findByTicketCode(code);

  return normalizeTicket(ticket);
}

async function updateTicket(code, payload) {
  const existingTicket = await userRepository.findByTicketCode(code);

  if (!existingTicket) {
    return null;
  }

  const participantData = sanitizeParticipant(payload);
  const updatedTicket = await userRepository.updateParticipant(code, {
    ...participantData,
    statut: payload.statut
  });

  return normalizeTicket(updatedTicket);
}

async function validateTicketEntry(value) {
  const code = extractTicketCode(value);
  const ticket = await userRepository.findByTicketCode(code);

  if (!ticket) {
    return { status: 'not_found', ticket: null };
  }

  if (ticket.statut === 'used') {
    return { status: 'already_used', ticket: normalizeTicket(ticket) };
  }

  await userRepository.markTicketAsUsed(code);
  const updatedTicket = await userRepository.findByTicketCode(code);

  return { status: 'validated', ticket: normalizeTicket(updatedTicket) };
}

function sanitizeParticipant(payload) {
  return {
    nom: payload.nom?.trim() || '',
    telephone: payload.telephone?.trim() || '',
    email: payload.email?.trim() || null
  };
}

function extractTicketCode(value) {
  const rawValue = String(value || '').trim();

  try {
    const parsedUrl = new URL(rawValue);
    return parsedUrl.searchParams.get('code') || rawValue;
  } catch {
    return rawValue;
  }
}

async function getStats() {
  return userRepository.getStats();
}

module.exports = {
  registerParticipant,
  listTickets,
  getTicketByCode,
  updateTicket,
  validateTicketEntry,
  getStats
};

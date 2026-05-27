const userRepository = require('../repositories/userRepository');
const generateTicketCode = require('../utils/generateTicketCode');
const { generateQrCode } = require('../utils/qrGenerator');

function normalizeTicket(row) {
  if (!row) return null;
  return {
    id:         row.id,
    nom:        row.nom,
    prenom:     row.prenom || '',
    telephone:  row.telephone,
    vendeur:    row.vendeur || '',
    ticketCode: row.ticket_code,
    qrCode:     row.qr_code,
    statut:     row.statut,
    dateAchat:  row.date_achat,
    dateScan:   row.date_scan
  };
}

/**
 * Crée N tickets pour un même participant (un QR code par ticket physique).
 * @param {object} payload — { nom, prenom, telephone, vendeur, dateAchat, nombreTickets }
 * @param {object} options — { baseUrl }
 * @returns {Array} tableau de tickets normalisés
 */
async function registerParticipant(payload, options = {}) {
  const data = sanitizeParticipant(payload);
  const nombreTickets = Math.max(1, parseInt(payload.nombreTickets) || 1);
  const tickets = [];

  for (let i = 0; i < nombreTickets; i++) {
    let participant = null;
    let attempts = 0;

    while (!participant && attempts < 5) {
      attempts += 1;
      const ticketCode = generateTicketCode();
      const ticketUrl  = `${options.baseUrl}/ticket.html?code=${encodeURIComponent(ticketCode)}`;
      const qrCode     = await generateQrCode(ticketUrl);

      try {
        participant = await userRepository.createParticipant({
          ...data,
          ticketCode,
          qrCode
        });
      } catch (error) {
        // 23505 = unique violation (code déjà pris), on réessaie
        if (error.code !== '23505' || attempts >= 5) throw error;
      }
    }

    tickets.push(normalizeTicket(participant));
  }

  return tickets;
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
  const existing = await userRepository.findByTicketCode(code);
  if (!existing) return null;

  const data = sanitizeParticipant(payload);
  const updated = await userRepository.updateParticipant(code, {
    ...data,
    statut: payload.statut
  });
  return normalizeTicket(updated);
}

async function deleteTicket(code) {
  const existing = await userRepository.findByTicketCode(code);
  if (!existing) return false;
  await userRepository.deleteParticipant(code);
  return true;
}

async function validateTicketEntry(value) {
  const code   = extractTicketCode(value);
  const ticket = await userRepository.findByTicketCode(code);

  if (!ticket) return { status: 'not_found', ticket: null };
  if (ticket.statut === 'used') return { status: 'already_used', ticket: normalizeTicket(ticket) };

  await userRepository.markTicketAsUsed(code);
  const updated = await userRepository.findByTicketCode(code);
  return { status: 'validated', ticket: normalizeTicket(updated) };
}

async function getStats() {
  return userRepository.getStats();
}

function sanitizeParticipant(payload) {
  return {
    nom:       (payload.nom       || '').trim(),
    prenom:    (payload.prenom    || '').trim(),
    telephone: (payload.telephone || '').trim(),
    vendeur:   (payload.vendeur   || '').trim(),
    dateAchat: payload.dateAchat || new Date().toISOString()
  };
}

function extractTicketCode(value) {
  const raw = String(value || '').trim();

  // 1. Essayer de parser comme une URL et extraire le paramètre ?code=
  try {
    const url = new URL(raw);
    const codeParam = url.searchParams.get('code');
    if (codeParam) return codeParam.trim();
  } catch {
    // pas une URL valide, continuer
  }

  // 2. Chercher un pattern ?code= même dans une string mal formée
  const codeMatch = raw.match(/[?&]code=([^&\s]+)/i);
  if (codeMatch) return decodeURIComponent(codeMatch[1]).trim();

  // 3. Chercher un pattern de code ticket directement (ex: BAL-2026-XXXX)
  const ticketMatch = raw.match(/(BAL-\d{4}-[A-Z0-9]+)/i);
  if (ticketMatch) return ticketMatch[1].trim();

  // 4. Retourner la valeur brute
  return raw;
}

module.exports = {
  registerParticipant,
  listTickets,
  getTicketByCode,
  updateTicket,
  deleteTicket,
  validateTicketEntry,
  getStats
};

const ticketService = require('../services/ticketService');
const auditService  = require('../services/auditService');

// Enregistrer un (ou plusieurs) ticket(s) pour un participant
async function registerParticipant(req, res, next) {
  try {
    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const tickets = await ticketService.registerParticipant(req.body, { baseUrl });

    const actor = req.admin?.username || req.admin?.nom || 'admin';
    const n = tickets.length;
    await auditService.log({
      utilisateur: actor,
      role: req.admin?.role || 'admin',
      action: 'ajout_participant',
      details: `Ajout de ${req.body.prenom || ''} ${req.body.nom || ''} — ${n} ticket(s), vendeur: ${req.body.vendeur || '-'}`
    });

    return res.status(201).json({ message: `${n} ticket(s) généré(s) avec succès.`, tickets });
  } catch (error) {
    return next(error);
  }
}

async function getTickets(req, res, next) {
  try {
    const tickets = await ticketService.listTickets();
    return res.json({ tickets });
  } catch (error) {
    return next(error);
  }
}

async function getTicketByCode(req, res, next) {
  try {
    const ticket = await ticketService.getTicketByCode(req.params.code);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' });
    return res.json({ ticket });
  } catch (error) {
    return next(error);
  }
}

async function updateTicket(req, res, next) {
  try {
    const ticket = await ticketService.updateTicket(req.params.code, req.body);
    if (!ticket) return res.status(404).json({ message: 'Ticket introuvable.' });

    await auditService.log({
      utilisateur: req.admin?.username || 'admin',
      role: req.admin?.role || 'admin',
      action: 'modification_ticket',
      details: `Ticket ${req.params.code} modifié`
    });

    return res.json({ message: 'Ticket modifié avec succès.', ticket });
  } catch (error) {
    return next(error);
  }
}

async function deleteTicket(req, res, next) {
  try {
    const deleted = await ticketService.deleteTicket(req.params.code);
    if (!deleted) return res.status(404).json({ message: 'Ticket introuvable.' });

    await auditService.log({
      utilisateur: req.admin?.username || 'admin',
      role: req.admin?.role || 'admin',
      action: 'suppression_ticket',
      details: `Ticket ${req.params.code} supprimé`
    });

    return res.json({ message: 'Ticket supprimé avec succès.' });
  } catch (error) {
    return next(error);
  }
}

async function scanTicket(req, res, next) {
  try {
    const result = await ticketService.validateTicketEntry(req.body.code);

    if (result.status === 'not_found')    return res.status(404).json({ valid: false, message: 'Ticket introuvable.' });
    if (result.status === 'already_used') return res.status(409).json({ valid: false, message: 'Ticket déjà utilisé.', ticket: result.ticket });

    await auditService.log({
      utilisateur: req.admin?.username || req.admin?.nom || 'controleur',
      role: req.admin?.role || 'controleur',
      action: 'scan_ticket',
      details: `Ticket ${result.ticket?.ticketCode} scanné — ${result.ticket?.nom || ''} ${result.ticket?.prenom || ''}`
    });

    return res.json({ valid: true, message: 'Entrée validée.', ticket: result.ticket });
  } catch (error) {
    return next(error);
  }
}

async function getStats(req, res, next) {
  try {
    const stats = await ticketService.getStats();
    return res.json({ stats });
  } catch (error) {
    return next(error);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const logs = await auditService.getLogs();
    return res.json({ logs });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registerParticipant, getTickets, getTicketByCode,
  updateTicket, deleteTicket, scanTicket, getStats, getAuditLogs
};

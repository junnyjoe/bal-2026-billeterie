const ticketService = require('../services/ticketService');

async function registerParticipant(req, res, next) {
  try {
    const ticket = await ticketService.registerParticipant(req.body, {
      baseUrl: process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`
    });

    return res.status(201).json({
      message: 'Participant enregistre avec succes.',
      ticket
    });
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

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket introuvable.' });
    }

    return res.json({ ticket });
  } catch (error) {
    return next(error);
  }
}

async function updateTicket(req, res, next) {
  try {
    const ticket = await ticketService.updateTicket(req.params.code, req.body);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket introuvable.' });
    }

    return res.json({
      message: 'Ticket modifie avec succes.',
      ticket
    });
  } catch (error) {
    return next(error);
  }
}

async function scanTicket(req, res, next) {
  try {
    const result = await ticketService.validateTicketEntry(req.body.code);

    if (result.status === 'not_found') {
      return res.status(404).json({ valid: false, message: 'Ticket introuvable.' });
    }

    if (result.status === 'already_used') {
      return res.status(409).json({
        valid: false,
        message: 'Ticket deja utilise.',
        ticket: result.ticket
      });
    }

    return res.json({
      valid: true,
      message: 'Entree validee.',
      ticket: result.ticket
    });
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

module.exports = {
  registerParticipant,
  getTickets,
  getTicketByCode,
  updateTicket,
  scanTicket,
  getStats
};

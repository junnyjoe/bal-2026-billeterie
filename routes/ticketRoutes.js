const express = require('express');
const { body, param } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const validateRequest  = require('../middleware/validateRequest');
const { requireAdmin, requireAdminOrController } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Enregistrer participant (N tickets) ─── ADMIN only
router.post(
  '/register',
  requireAdmin,
  [
    body('nom').trim().escape().isLength({ min: 1, max: 120 }).withMessage('Nom obligatoire.'),
    body('prenom').trim().escape().isLength({ min: 0, max: 120 }),
    body('telephone').trim().escape().isLength({ min: 6, max: 30 }).withMessage('Téléphone obligatoire.'),
    body('vendeur').trim().escape().isLength({ min: 0, max: 120 }),
    body('nombreTickets').optional().isInt({ min: 1, max: 20 }).withMessage('Nombre de tickets invalide (1-20).'),
    body('dateAchat').optional().isISO8601().withMessage('Date d\'achat invalide.')
  ],
  validateRequest,
  ticketController.registerParticipant
);

// ── Liste des tickets ─── Admin + Controleur
router.get('/tickets', requireAdminOrController, ticketController.getTickets);

// ── Stats ─── Admin only
router.get('/stats', requireAdmin, ticketController.getStats);

// ── Logs d'audit ─── Admin only
router.get('/audit-logs', requireAdmin, ticketController.getAuditLogs);

// ── Ticket par code ─── Admin + Controleur
router.get(
  '/ticket/:code',
  requireAdminOrController,
  [param('code').trim().escape().isLength({ min: 3, max: 80 })],
  validateRequest,
  ticketController.getTicketByCode
);

// ── Modifier ticket ─── Admin only
router.put(
  '/ticket/:code',
  requireAdmin,
  [
    param('code').trim().escape().isLength({ min: 3, max: 80 }),
    body('nom').optional().trim().escape().isLength({ min: 1, max: 120 }),
    body('prenom').optional().trim().escape().isLength({ min: 0, max: 120 }),
    body('telephone').optional().trim().escape().isLength({ min: 6, max: 30 }),
    body('vendeur').optional().trim().escape().isLength({ min: 0, max: 120 }),
    body('statut').optional().isIn(['active', 'used', 'cancelled']).withMessage('Statut invalide.')
  ],
  validateRequest,
  ticketController.updateTicket
);

// ── Supprimer ticket ─── Admin only
router.delete(
  '/ticket/:code',
  requireAdmin,
  [param('code').trim().escape().isLength({ min: 3, max: 80 })],
  validateRequest,
  ticketController.deleteTicket
);

// ── Scan ─── Admin + Controleur
router.post(
  '/scan',
  requireAdminOrController,
  [body('code').trim().escape().isLength({ min: 3, max: 300 }).withMessage('Code ticket obligatoire.')],
  validateRequest,
  ticketController.scanTicket
);

module.exports = router;

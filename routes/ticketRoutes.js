const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/ticketController');
const validateRequest = require('../middleware/validateRequest');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('nom').trim().escape().isLength({ min: 2, max: 120 }).withMessage('Le nom doit contenir entre 2 et 120 caracteres.'),
    body('telephone').trim().escape().isLength({ min: 6, max: 30 }).withMessage('Le telephone est obligatoire.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email invalide.')
  ],
  validateRequest,
  userController.registerParticipant
);

router.get('/tickets', requireAdmin, userController.getTickets);

router.get('/stats', requireAdmin, userController.getStats);

router.get(
  '/ticket/:code',
  [param('code').trim().escape().isLength({ min: 6, max: 80 }).withMessage('Code ticket invalide.')],
  validateRequest,
  userController.getTicketByCode
);

router.put(
  '/ticket/:code',
  requireAdmin,
  [
    param('code').trim().escape().isLength({ min: 6, max: 80 }).withMessage('Code ticket invalide.'),
    body('nom').trim().escape().isLength({ min: 2, max: 120 }).withMessage('Le nom doit contenir entre 2 et 120 caracteres.'),
    body('telephone').trim().escape().isLength({ min: 6, max: 30 }).withMessage('Le telephone est obligatoire.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('statut').isIn(['active', 'used']).withMessage('Statut invalide.')
  ],
  validateRequest,
  userController.updateTicket
);

router.post(
  '/scan',
  requireAdmin,
  [body('code').trim().escape().isLength({ min: 6, max: 300 }).withMessage('Code ticket obligatoire.')],
  validateRequest,
  userController.scanTicket
);

module.exports = router;

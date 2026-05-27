const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Login (accessible à tous)
router.post(
  '/login',
  [
    body('email').trim().isLength({ min: 2, max: 200 }).withMessage('Identifiant obligatoire.'),
    body('password').isLength({ min: 6, max: 200 }).withMessage('Mot de passe obligatoire.')
  ],
  validateRequest,
  authController.login
);

// Session courante
router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);

// Gestion des utilisateurs (admin seulement)
router.post(
  '/users',
  requireAdmin,
  [
    body('nom').trim().escape().isLength({ min: 2, max: 120 }).withMessage('Nom obligatoire.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password').isLength({ min: 6, max: 200 }).withMessage('Mot de passe obligatoire (6 car. min).'),
    body('role').isIn(['admin', 'controleur']).withMessage('Rôle invalide.')
  ],
  validateRequest,
  authController.createUser
);

router.get('/users', requireAdmin, authController.listUsers);
router.delete('/users/:id', requireAdmin, authController.deleteUser);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').optional().trim().isEmail().withMessage('Email invalide.'),
    body('username').optional().trim().escape().isLength({ min: 2, max: 80 }).withMessage('Nom utilisateur obligatoire.'),
    body('password').isLength({ min: 8, max: 200 }).withMessage('Mot de passe obligatoire (8 caractères minimum).')
  ],
  validateRequest,
  authController.login
);

router.post(
  '/register',
  [
    body('nom').trim().escape().isLength({ min: 2, max: 120 }).withMessage('Le nom doit contenir entre 2 et 120 caractères.'),
    body('telephone').optional({ checkFalsy: true }).trim().escape().isLength({ min: 6, max: 30 }).withMessage('Téléphone invalide.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password').isLength({ min: 8, max: 200 }).withMessage('Le mot de passe doit contenir au moins 8 caractères.')
  ],
  validateRequest,
  authController.register
);

router.get('/me', requireAuth, authController.me);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;

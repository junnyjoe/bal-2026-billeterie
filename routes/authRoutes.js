const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/login',
  [
    body('username').trim().escape().isLength({ min: 2, max: 80 }).withMessage('Nom utilisateur obligatoire.'),
    body('password').isLength({ min: 8, max: 200 }).withMessage('Mot de passe obligatoire.')
  ],
  validateRequest,
  authController.login
);

router.get('/me', requireAdmin, authController.me);
router.post('/logout', requireAdmin, authController.logout);

module.exports = router;

// app.js — Express app factory (sans server.listen pour permettre les tests)
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes'); // corrigé : était "userRoutes"
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Sécurité des en-têtes ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", 'blob:']
    }
  }
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_BASE_URL,
  credentials: true
}));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques (frontend) ─────────────────────────────────────────────
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// ── Rate limiting sur l'inscription publique ──────────────────────────────────
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});
app.use('/api/register', publicLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', ticketRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Gestion des erreurs ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

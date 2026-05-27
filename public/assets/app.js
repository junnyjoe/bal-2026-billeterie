/* ============================================================
   API client partagé
   ============================================================ */
const api = {
  async login(data) {
    return request('POST', '/api/auth/login', data);
  },
  async getSession() {
    return request('GET', '/api/auth/me');
  },
  async logout() {
    return request('POST', '/api/auth/logout');
  },

  // Participants / Tickets
  async registerParticipant(data) {
    return request('POST', '/api/register', data);
  },
  async getTickets() {
    return request('GET', '/api/tickets');
  },
  async getTicket(code) {
    return request('GET', `/api/ticket/${encodeURIComponent(code)}`);
  },
  async updateTicket(code, data) {
    return request('PUT', `/api/ticket/${encodeURIComponent(code)}`, data);
  },
  async deleteTicket(code) {
    return request('DELETE', `/api/ticket/${encodeURIComponent(code)}`);
  },
  async scan(code) {
    return request('POST', '/api/scan', { code });
  },
  async getStats() {
    return request('GET', '/api/stats');
  },
  async getAuditLogs() {
    return request('GET', '/api/audit-logs');
  },

  // Utilisateurs
  async createUser(data) {
    return request('POST', '/api/auth/users', data);
  },
  async listUsers() {
    return request('GET', '/api/auth/users');
  },
  async deleteUser(id) {
    return request('DELETE', `/api/auth/users/${id}`);
  }
};

async function request(method, url, data) {
  const opts = { method, credentials: 'same-origin' };
  if (data) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body    = JSON.stringify(data);
  }
  const response = await fetch(url, opts);
  const payload  = await response.json();
  if (!response.ok) {
    const err = new Error(payload.message || 'Une erreur est survenue.');
    err.payload = payload; err.status = response.status;
    throw err;
  }
  return payload;
}

/* ============================================================
   UI helpers
   ============================================================ */
function showMessage(target, text, type = 'info') {
  if (!target) return;
  target.textContent = text;
  target.className   = `message${type === 'error' ? ' error' : ''}`;
  target.hidden      = false;
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDateOnly(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function renderTicket(ticket, target) {
  target.innerHTML = `
    <article class="ticket">
      <div class="ticket-header">
        <h2>Ticket d'entrée</h2>
        <div>Casino Masqué · Bal 2026</div>
      </div>
      <div class="ticket-body">
        <div>
          <h1>${escapeHtml(ticket.prenom || '')} ${escapeHtml(ticket.nom)}</h1>
          <p>Téléphone : ${escapeHtml(ticket.telephone)}</p>
          <p>Vendeur : ${escapeHtml(ticket.vendeur || '-')}</p>
          <p>Date : ${formatDate(ticket.dateAchat)}</p>
          <span class="ticket-code">${escapeHtml(ticket.ticketCode)}</span>
        </div>
        <div class="qr">
          <img src="${ticket.qrCode}" alt="QR code ${escapeHtml(ticket.ticketCode)}">
        </div>
      </div>
    </article>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

window.ticketApi = api;
window.ticketUi  = { showMessage, renderTicket, formatDate, formatDateOnly, escapeHtml };

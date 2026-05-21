const api = {
  async login(data) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });

    return parseResponse(response);
  },

  async getSession() {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin'
    });

    return parseResponse(response);
  },

  async logout() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });

    return parseResponse(response);
  },

  async register(data) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    return parseResponse(response);
  },

  async getTickets() {
    const response = await fetch('/api/tickets', {
      credentials: 'same-origin'
    });
    return parseResponse(response);
  },

  async getTicket(code) {
    const response = await fetch(`/api/ticket/${encodeURIComponent(code)}`);
    return parseResponse(response);
  },

  async updateTicket(code, data) {
    const response = await fetch(`/api/ticket/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });

    return parseResponse(response);
  },

  async scan(code) {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ code })
    });

    return parseResponse(response);
  },

  async getStats() {
    const response = await fetch('/api/stats', {
      credentials: 'same-origin'
    });
    return parseResponse(response);
  }
};

async function parseResponse(response) {
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.message || 'Une erreur est survenue.');
    error.payload = payload;
    throw error;
  }

  return payload;
}

function showMessage(target, text, type = 'info') {
  if (!target) {
    return;
  }

  target.textContent = text;
  target.className = `message${type === 'error' ? ' error' : ''}`;
  target.hidden = false;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function renderTicket(ticket, target) {
  target.innerHTML = `
    <article class="ticket">
      <div class="ticket-header">
        <h2>Ticket d'entree</h2>
        <div>Casino Masqué</div>
      </div>
      <div class="ticket-body">
        <div>
          <h1>${escapeHtml(ticket.nom)}</h1>
          <p>Telephone : ${escapeHtml(ticket.telephone)}</p>
          <p>Email : ${escapeHtml(ticket.email || '-')}</p>
          <p>Date : ${formatDate(ticket.dateAchat)}</p>
          <span class="ticket-code">${escapeHtml(ticket.ticketCode)}</span>
        </div>
        <div class="qr">
          <img src="${ticket.qrCode}" alt="QR code du ticket ${escapeHtml(ticket.ticketCode)}">
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.ticketApi = api;
window.ticketUi = {
  showMessage,
  renderTicket,
  formatDate,
  escapeHtml
};

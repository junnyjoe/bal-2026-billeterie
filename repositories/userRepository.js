const supabase = require('../config/db');

async function createParticipant({ nom, telephone, email, ticketCode, qrCode }) {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      nom,
      telephone,
      email: email || null,
      ticket_code: ticketCode,
      qr_code: qrCode
    })
    .select('id, nom, telephone, email, ticket_code, qr_code, statut, date_achat, date_scan')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('participants')
    .select('id, nom, telephone, email, ticket_code, qr_code, statut, date_achat, date_scan')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findByTicketCode(code) {
  const { data, error } = await supabase
    .from('participants')
    .select('id, nom, telephone, email, ticket_code, qr_code, statut, date_achat, date_scan')
    .eq('ticket_code', code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function listParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select('id, nom, telephone, email, ticket_code, statut, date_achat, date_scan')
    .order('date_achat', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function updateParticipant(code, payload) {
  const updates = Object.fromEntries(
    Object.entries(payload)
      .filter(([_, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from('participants')
    .update(updates)
    .eq('ticket_code', code)
    .select('id, nom, telephone, email, ticket_code, qr_code, statut, date_achat, date_scan')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function markTicketAsUsed(code) {
  const { data, error } = await supabase
    .from('participants')
    .update({
      statut: 'used',
      date_scan: new Date().toISOString()
    })
    .eq('ticket_code', code)
    .eq('statut', 'active')
    .select('id');

  if (error) {
    throw error;
  }

  return data.length > 0;
}

async function getStats() {
  // Récupère statut + date_achat en une seule requête pour calculer toutes les métriques
  const { data, error } = await supabase
    .from('participants')
    .select('statut, date_achat');

  if (error) {
    throw error;
  }

  const rows = data || [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = {
    total: rows.length,
    actifs: 0,
    utilises: 0,
    annules: 0,
    ventesJour: 0
  };

  for (const row of rows) {
    if (row.statut === 'active') stats.actifs += 1;
    else if (row.statut === 'used') stats.utilises += 1;
    else if (row.statut === 'cancelled') stats.annules += 1;

    if (row.date_achat && new Date(row.date_achat) >= todayStart) {
      stats.ventesJour += 1;
    }
  }

  return stats;
}

module.exports = {
  createParticipant,
  findByTicketCode,
  listParticipants,
  updateParticipant,
  markTicketAsUsed,
  getStats
};

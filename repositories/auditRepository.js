const supabase = require('../config/db');

async function createLog({ utilisateur, role, action, details }) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({ utilisateur, role, action, details: details || null });

  if (error) {
    // On ne fait pas planter le serveur si le log échoue
    console.error('[audit] Erreur insertion log:', error.message);
  }
}

async function getLogs({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, utilisateur, role, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

module.exports = { createLog, getLogs };

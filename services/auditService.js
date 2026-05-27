const auditRepository = require('../repositories/auditRepository');

async function log({ utilisateur, role, action, details }) {
  await auditRepository.createLog({ utilisateur, role, action, details });
}

async function getLogs() {
  return auditRepository.getLogs();
}

module.exports = { log, getLogs };

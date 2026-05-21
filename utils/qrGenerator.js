// Re-export from services/qrGenerator for backward compatibility
const { generateQrCode } = require('../services/qrGenerator');

module.exports = { generateQrCode };

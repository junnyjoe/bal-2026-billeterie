const QRCode = require('qrcode');

async function generateQrCode(value) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320
  });
}

module.exports = {
  generateQrCode
};

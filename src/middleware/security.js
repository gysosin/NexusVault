const { decrypt } = require('../utils/encryption');

const decryptPayload = (req, res, next) => {
  if (req.body && req.body.payload) {
    const decrypted = decrypt(req.body.payload);
    if (!decrypted) {
      return res.status(400).json({ error: 'Failed to decrypt payload.' });
    }
    try {
      req.body = JSON.parse(decrypted);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid encrypted payload.' });
    }
  }
  next();
};

module.exports = { decryptPayload };

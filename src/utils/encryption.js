const CryptoJS = require('crypto-js');
const { API_SECRET } = require('../config/env');

const encrypt = (text) => {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, API_SECRET).toString();
};

const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, API_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
};

module.exports = { encrypt, decrypt };

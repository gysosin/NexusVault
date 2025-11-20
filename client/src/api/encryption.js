import CryptoJS from 'crypto-js';

// Must match server's API_SECRET (defaults to "default_api_secret")
const API_SECRET = import.meta.env.VITE_API_SECRET || 'default_api_secret';

export const encryptPayload = (data) => {
  if (!data) return null;
  const json = JSON.stringify(data);
  return CryptoJS.AES.encrypt(json, API_SECRET).toString();
};

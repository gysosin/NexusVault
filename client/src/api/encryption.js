import CryptoJS from 'crypto-js';

const API_SECRET = import.meta.env.VITE_API_SECRET || 'dev-secret-key-change-in-prod';

export const encryptPayload = (data) => {
  if (!data) return null;
  const json = JSON.stringify(data);
  return CryptoJS.AES.encrypt(json, API_SECRET).toString();
};

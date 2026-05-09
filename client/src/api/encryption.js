import CryptoJS from 'crypto-js';

const API_SECRET = import.meta.env.VITE_API_SECRET || (import.meta.env.DEV ? 'default_api_secret' : '');

const apiSecret = () => {
  if (!API_SECRET) {
    throw new Error('VITE_API_SECRET is required to encrypt connection payloads.');
  }
  return API_SECRET;
};

export const encryptPayload = (data) => {
  if (!data) return null;
  const json = JSON.stringify(data);
  return CryptoJS.AES.encrypt(json, apiSecret()).toString();
};

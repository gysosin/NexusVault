import { readAuthToken } from '@/lib/authTokenStorage';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const configuredTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const DEFAULT_REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
  ? configuredTimeoutMs
  : 15000;

export const requestJson = async (endpoint, { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const fetchOptions = {
    method,
    headers: { Accept: 'application/json', ...headers },
    signal: controller.signal,
  };

  const token = readAuthToken();
  if (token) {
    fetchOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    if (response.status === 204) return {};

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

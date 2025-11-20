const API_BASE = import.meta.env.VITE_API_BASE || '';

export const requestJson = async (endpoint, { method = 'GET', body, headers = {} } = {}) => {
  const fetchOptions = {
    method,
    headers: { Accept: 'application/json', ...headers },
  };
  
  const token = window.localStorage.getItem('auth_token');
  if (token) {
    fetchOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
  if (response.status === 204) return {};
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }
  return data;
};

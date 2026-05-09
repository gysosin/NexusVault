import { requestJson } from './client';

export const getConnections = () => 
  requestJson('/api/connections');

export const createConnection = (data) => {
  const payload = { ...data };
  if (payload.port !== undefined && payload.port !== null && payload.port !== '') {
    const numericPort = Number(payload.port);
    if (!Number.isNaN(numericPort)) {
      payload.port = numericPort;
    } else {
      delete payload.port;
    }
  }

  return requestJson('/api/connections', {
    method: 'POST',
    body: payload,
  });
};

export const deleteConnection = (id) => 
  requestJson(`/api/connections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const checkConnectionHealth = (id) =>
  requestJson(`/api/connections/${encodeURIComponent(id)}/health`, {
    timeoutMs: 5000,
  });

export const setConnectionFavorite = (id, isFavorite) =>
  requestJson(`/api/connections/${encodeURIComponent(id)}/favorite`, {
    method: 'PATCH',
    body: { isFavorite },
  });

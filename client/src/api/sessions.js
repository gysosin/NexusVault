import { requestJson } from './client';

export const getActiveSessions = () => 
  requestJson('/api/sessions/active');

export const getSessionHistory = (connectionId, options = {}) => {
  const params = new URLSearchParams();
  if (connectionId) {
    params.set('connectionId', connectionId);
  }
  if (options.limit) {
    params.set('limit', String(options.limit));
  }

  const query = params.toString();
  return requestJson(`/api/sessions/history${query ? `?${query}` : ''}`);
};

export const getSessionDetails = (sessionId) => 
  requestJson(`/api/sessions/history/${encodeURIComponent(sessionId)}`);

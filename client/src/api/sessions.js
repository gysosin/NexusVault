import { requestJson } from './client';

export const getActiveSessions = () => 
  requestJson('/api/sessions/active');

export const getSessionHistory = (connectionId) => {
  const query = connectionId ? `?connectionId=${connectionId}` : '';
  return requestJson(`/api/sessions/history${query}`);
};

export const getSessionDetails = (sessionId) => 
  requestJson(`/api/sessions/history/${sessionId}`);

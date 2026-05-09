import { requestJson } from './client';

export const getFailedLoginTrend = () =>
  requestJson('/api/security/failed-logins/trend');

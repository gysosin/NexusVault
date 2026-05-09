import { requestJson } from './client';

export const getMaintenanceBanner = () =>
  requestJson('/api/system/maintenance-banner');

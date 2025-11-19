import { requestJson } from './client';

export const getConnections = () => 
  requestJson('/api/connections');

export const createConnection = (data) => 
  requestJson('/api/connections', {
    method: 'POST',
    body: data,
  });

export const deleteConnection = (id) => 
  requestJson(`/api/connections/${id}`, {
    method: 'DELETE',
  });

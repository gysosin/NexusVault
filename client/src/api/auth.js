import { requestJson } from './client';

export const login = (identifier, password) => 
  requestJson('/api/auth/login', {
    method: 'POST',
    body: { username: identifier, email: identifier, password },
  });

export const register = (data) => 
  requestJson('/api/auth/register', {
    method: 'POST',
    body: data,
  });

export const logout = () => 
  requestJson('/api/auth/logout', {
    method: 'POST',
  });

export const getMe = () => 
  requestJson('/api/auth/me');

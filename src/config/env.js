require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_TTL: Number(process.env.JWT_TTL || 3600),
  API_SECRET: process.env.API_SECRET || 'dev-secret-key-change-in-prod',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/web_client',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  SESSION_BUFFER_CHARS: Number(process.env.SESSION_BUFFER_CHARS || 200000),
  CORS_ORIGIN: process.env.CORS_ORIGIN === 'auto' ? undefined : process.env.CORS_ORIGIN,
};

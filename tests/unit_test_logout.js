const assert = require('assert');
const path = require('path');

// Helper to mock modules
const mockModule = (relativePath, exports) => {
  const resolved = require.resolve(relativePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: exports
  };
};

// Mock dependencies
const mockJwt = {
  verify: () => ({ userId: 123 }),
  sign: () => 'token'
};
const mockRedis = {
  del: async () => {},
  setEx: async () => {},
  keys: async () => []
};
const mockSessionService = {
  terminateSessionsForUser: (userId, reason) => {
    console.log(`terminateSessionsForUser called with ${userId}, ${reason}`);
    assert.strictEqual(userId, 123);
    assert.strictEqual(reason, 'User logged out');
  },
  getAllSessions: () => []
};
const mockLogger = {
  logActivity: async () => {},
  log: () => {}
};
const mockDb = {
  pool: { query: async () => ({ rows: [] }) }
};
const mockEnv = {
  JWT_SECRET: 'secret',
  JWT_EXPIRES_IN: '1h',
  JWT_TTL: 3600
};
const mockAuthMiddleware = {
  sessionKey: (token) => `session:${token}`,
  authenticate: (req, res, next) => next()
};

// Apply mocks
try {
  mockModule('jsonwebtoken', mockJwt);
  mockModule('bcrypt', { hash: async () => 'hash', compare: async () => true });
  mockModule('../src/lib/cache', mockRedis);
  mockModule('../src/services/sessionService', mockSessionService);
  mockModule('../src/lib/logger', mockLogger);
  mockModule('../src/utils/logger', mockLogger);
  mockModule('../src/lib/db', mockDb);
  mockModule('../src/config/env', mockEnv);
  mockModule('../src/middleware/auth', mockAuthMiddleware);
} catch (e) {
  console.error('Failed to mock modules:', e);
  process.exit(1);
}

// Load controller
const authController = require('../src/controllers/authController');

// Test
const req = {
  headers: {
    authorization: 'Bearer valid_token'
  }
};
const res = {
  sendStatus: (code) => {
    assert.strictEqual(code, 204);
    console.log('Test passed!');
  }
};

console.log('Running logout test...');
authController.logout(req, res).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

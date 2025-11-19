const jwt = require('jsonwebtoken');
const { pool } = require('../lib/db');
const redisClient = require('../lib/cache');
const { JWT_SECRET } = require('../config/env');

const sessionKey = (token) => `session:${token}`;

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token.' });
  }
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const cached = await redisClient.get(sessionKey(token));
  if (!cached) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const userId = Number(cached);
  const result = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [userId]);
  if (!result.rowCount) {
    return res.status(401).json({ error: 'User not found.' });
  }

  req.user = result.rows[0];
  req.token = token;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

const verifySocketAuth = async (token) => {
  if (!token) {
    throw new Error('Missing authorization token.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token.');
  }

  const cached = await redisClient.get(sessionKey(token));
  if (!cached) {
    throw new Error('Session expired. Please log in again.');
  }

  return { userId: Number(cached), username: decoded.username, token };
};

module.exports = { authenticate, requireAdmin, verifySocketAuth, sessionKey };

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../lib/db');
const redisClient = require('../lib/cache');
const { logActivity } = require('../lib/logger');
const { log } = require('../utils/logger');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_TTL } = require('../config/env');
const { sessionKey, authenticate } = require('../middleware/auth');
const { terminateSessionsForUser } = require('../services/sessionService');

const register = async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    return res.status(400).json({ error: 'Invalid username.' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, role',
      [trimmedUsername, normalizedEmail, hashed],
    );

    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }
    log('Registration failed', err);
    return res.status(500).json({ error: 'Unable to create account.' });
  }
};

const login = async (req, res) => {
  const { username, email, password } = req.body || {};
  const identifier = (username || email || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required.' });
  }

  const { rows } = await pool.query(
    'SELECT id, username, email, password, role FROM users WHERE username = $1 OR email = $2 LIMIT 1',
    [identifier, identifier.toLowerCase()],
  );

  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
  await redisClient.setEx(sessionKey(token), JWT_TTL, user.id.toString());
  await logActivity(user.id, 'Login', 'Web Client', 'Success');

  return res.json({
    token,
    expiresIn: JWT_EXPIRES_IN,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
};

const logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(204);
  }
  const token = authHeader.slice(7);
  
  try {
    // Verify token but ignore expiration to allow cleanup
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    await redisClient.del(sessionKey(token));
    
    // Terminate all active SSH sessions for this user
    terminateSessionsForUser(decoded.userId, 'User logged out');
    
    await logActivity(decoded.userId, 'Logout', 'Web Client', 'Success');
  } catch (err) {
    // Invalid token signature or other error, just ignore
  }
  
  res.sendStatus(204);
};

const getMe = (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, logout, getMe };

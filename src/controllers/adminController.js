const bcrypt = require('bcrypt');
const { pool } = require('../lib/db');
const redisClient = require('../lib/cache');
const { logActivity } = require('../lib/logger');
const { log } = require('../utils/logger');
const { getAllSessions } = require('../services/sessionService');

const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    log('Error fetching users', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashed, role || 'user']
    );
    await logActivity(req.user.id, 'Create User', username, 'Success');
    res.status(201).json(rows[0]);
  } catch (err) {
    log('Error creating user', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Role is required.' });
  try {
    const { rowCount } = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    await logActivity(req.user.id, 'Update Role', `User ID ${req.params.id} -> ${role}`, 'Success');
    res.json({ success: true });
  } catch (err) {
    log('Error updating role', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    await logActivity(req.user.id, 'Delete User', `User ID ${req.params.id}`, 'Success');
    res.sendStatus(204);
  } catch (err) {
    log('Error deleting user', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

const getActivity = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.username 
      FROM activity_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    log('Error fetching activity', err);
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
};

const getRoles = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM roles ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    log('Error fetching roles', err);
    res.status(500).json({ error: 'Failed to fetch roles.' });
  }
};

const createRole = async (req, res) => {
  const { id, name, description, permissions } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Role ID and Name are required.' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO roles (id, name, description, permissions) VALUES ($1, $2, $3, $4) RETURNING *',
      [id.toLowerCase(), name, description, JSON.stringify(permissions || [])]
    );
    await logActivity(req.user.id, 'Create Role', name, 'Success');
    res.status(201).json(rows[0]);
  } catch (err) {
    log('Error creating role', err);
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Role ID or Name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create role.' });
  }
};

const deleteRole = async (req, res) => {
  const { id } = req.params;
  if (['admin', 'user', 'viewer'].includes(id)) {
    return res.status(403).json({ error: 'Cannot delete system roles.' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Role not found.' });
    await logActivity(req.user.id, 'Delete Role', id, 'Success');
    res.sendStatus(204);
  } catch (err) {
    log('Error deleting role', err);
    res.status(500).json({ error: 'Failed to delete role.' });
  }
};

const getStats = async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const connectionsCount = await pool.query('SELECT COUNT(*) FROM connections');
    const activeSessions = Array.from(getAllSessions()).length;
    const loggedInUsers = (await redisClient.keys('session:*')).length;
    
    res.json({
      users: parseInt(usersCount.rows[0].count),
      connections: parseInt(connectionsCount.rows[0].count),
      activeSessions,
      loggedInUsers
    });
  } catch (err) {
    log('Error fetching stats', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

const getSettings = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'general'");
    res.json(rows[0]?.value || {});
  } catch (err) {
    log('Error fetching settings', err);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
};

const updateSettings = async (req, res) => {
  const settings = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO system_settings (key, value) VALUES ('general', $1) ON CONFLICT (key) DO UPDATE SET value = $1 RETURNING value",
      [JSON.stringify(settings)]
    );
    await logActivity(req.user.id, 'Update Settings', 'General', 'Success');
    res.json(rows[0].value);
  } catch (err) {
    log('Error updating settings', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getActivity,
  getRoles,
  createRole,
  deleteRole,
  getStats,
  getSettings,
  updateSettings
};

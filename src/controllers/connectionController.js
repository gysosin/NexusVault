const { pool } = require('../lib/db');
const { logActivity } = require('../lib/logger');
const { log } = require('../utils/logger');
const { encrypt } = require('../utils/encryption');

const getConnections = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM connections WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const safeRows = rows.map(row => ({
      ...row,
      password: undefined,
      hasPassword: !!row.password
    }));
    res.json(safeRows);
  } catch (err) {
    log('Error fetching connections', err);
    res.status(500).json({ error: 'Failed to fetch connections.' });
  }
};

const createConnection = async (req, res) => {
  const { name, host, port, username } = req.body;
  if (!name || !host || !username) {
    return res.status(400).json({ error: 'Name, host, and username are required.' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO connections (user_id, name, host, port, username, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, name, host, port || 22, username, encrypt(req.body.password)]
    );
    const safeRow = { ...rows[0], password: undefined, hasPassword: !!rows[0].password };
    await logActivity(req.user.id, 'Create Connection', name, 'Success');
    res.status(201).json(safeRow);
  } catch (err) {
    log('Error creating connection', err);
    res.status(500).json({ error: 'Failed to create connection.' });
  }
};

const deleteConnection = async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM connections WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Connection not found.' });
    }
    res.sendStatus(204);
  } catch (err) {
    log('Error deleting connection', err);
    res.status(500).json({ error: 'Failed to delete connection.' });
  }
};

module.exports = { getConnections, createConnection, deleteConnection };

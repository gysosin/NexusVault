const { pool } = require('../lib/db');
const { log } = require('../utils/logger');
const { getAllSessions } = require('../services/sessionService');

const getActiveSessions = (req, res) => {
  const list = [];
  for (const session of getAllSessions()) {
    if (session.userId === req.user.id) {
      list.push({
        id: session.id,
        host: session.host,
        username: session.username,
        port: session.port,
        connectionId: session.connectionId,
        attached: Boolean(session.ws),
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      });
    }
  }

  list.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
  res.json(list);
};

const getSessionHistory = async (req, res) => {
  const { connectionId } = req.query;
  try {
    let query = 'SELECT id, session_id, host, username, start_time, end_time, status FROM session_histories WHERE user_id = $1';
    const params = [req.user.id];
    
    if (connectionId) {
      query += ' AND connection_id = $2';
      params.push(connectionId);
    }
    
    query += ' ORDER BY start_time DESC LIMIT 50';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    log('Error fetching session history', err);
    res.status(500).json({ error: 'Failed to fetch session history.' });
  }
};

const getSessionDetails = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM session_histories WHERE session_id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Session history not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    log('Error fetching session details', err);
    res.status(500).json({ error: 'Failed to fetch session details.' });
  }
};

module.exports = { getActiveSessions, getSessionHistory, getSessionDetails };

const { pool } = require('./db');

const logActivity = async (userId, action, target, status = 'Success', details = null) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, target, status, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, target, status, details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = { logActivity };

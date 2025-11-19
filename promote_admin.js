const { pool } = require('./lib/db');

const promoteUser = async (username) => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET role = 'admin' WHERE username = $1",
      [username]
    );
    if (rowCount > 0) {
      console.log(`User '${username}' promoted to admin.`);
    } else {
      console.log(`User '${username}' not found.`);
    }
  } catch (err) {
    console.error('Error promoting user:', err);
  } finally {
    await pool.end();
  }
};

const username = process.argv[2];
if (!username) {
  console.log('Usage: node promote_admin.js <username>');
  process.exit(1);
}

promoteUser(username);

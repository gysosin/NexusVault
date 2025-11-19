const { Pool } = require('pg');

const { DATABASE_URL, NODE_ENV } = require('../config/env');

const databaseUrl = DATABASE_URL;
const poolConfig = {
  connectionString: databaseUrl,
};

if (NODE_ENV === 'production') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

const initDb = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 22,
      username TEXT NOT NULL,
      password TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target TEXT,
      status TEXT DEFAULT 'Success',
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS session_histories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      connection_id INTEGER REFERENCES connections(id) ON DELETE SET NULL,
      session_id TEXT NOT NULL,
      host TEXT,
      username TEXT,
      start_time TIMESTAMPTZ DEFAULT NOW(),
      end_time TIMESTAMPTZ,
      log_content TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      permissions JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='connections' AND column_name='password') THEN
        ALTER TABLE connections ADD COLUMN password TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM roles WHERE id = 'admin') THEN
        INSERT INTO roles (id, name, description, permissions) VALUES 
        ('admin', 'Admin', 'Full system access', '["all"]'),
        ('user', 'User', 'Standard user access', '["manage_connections"]'),
        ('viewer', 'Viewer', 'Read-only access', '["view_connections"]');
      END IF;

      IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'general') THEN
        INSERT INTO system_settings (key, value) VALUES 
        ('general', '{"allowRegistration": true, "maintenanceMode": false, "defaultRole": "user"}');
      END IF;
    END $$;
  `;
  await pool.query(schema);
};

module.exports = {
  pool,
  initDb,
};

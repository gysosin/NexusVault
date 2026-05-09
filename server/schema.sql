-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    has_password BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) DEFAULT 'ssh',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connections_user_created_at
    ON connections (user_id, created_at DESC);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255),
    status VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
    ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created_at
    ON activity_logs (user_id, created_at DESC);

-- Session Histories table
CREATE TABLE IF NOT EXISTS session_histories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES connections(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    log_content TEXT,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_histories_session_id
    ON session_histories (session_id);

CREATE INDEX IF NOT EXISTS idx_session_histories_user_start_time
    ON session_histories (user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_session_histories_connection_start_time
    ON session_histories (connection_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_session_histories_active
    ON session_histories (end_time)
    WHERE end_time IS NULL;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

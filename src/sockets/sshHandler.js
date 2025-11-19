const { Client } = require('ssh2');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');
const { pool } = require('../lib/db');
const { log } = require('../utils/logger');
const { decrypt } = require('../utils/encryption');
const { sendJSON } = require('../utils/websocket');
const { verifySocketAuth } = require('../middleware/auth');
const { 
  sessions, 
  addSession, 
  getSession, 
  cleanupSession, 
  MAX_SESSION_BUFFER 
} = require('../services/sessionService');

const sendToSessionSocket = (session, payload) => {
  if (session?.sockets) {
    for (const ws of session.sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        sendJSON(ws, payload);
      }
    }
  } else if (session?.ws && session.ws.readyState === WebSocket.OPEN) {
      // Fallback for legacy single socket if needed, but we will migrate all to sockets
      sendJSON(session.ws, payload);
  }
};

const appendToSessionBuffer = (session, chunk) => {
  if (!session) return;
  const text = chunk.toString('utf8');
  session.buffer = (session.buffer + text).slice(-MAX_SESSION_BUFFER);
  session.lastActivity = Date.now();
  sendToSessionSocket(session, { type: 'data', data: text });
};

const emitSessionMetadata = (session, ws, resumed = false) => {
  if (!session || !ws) return;
  sendJSON(ws, {
    type: 'session',
    sessionId: session.id,
    host: session.host,
    username: session.username,
    port: session.port,
    connectionId: session.connectionId,
    resumed,
  });
};

const attachSessionToSocket = (session, ws, resumed = false) => {
  if (!session) return;
  
  if (!session.sockets) {
      session.sockets = new Set();
  }
  
  // Add new socket to the set
  session.sockets.add(ws);
  
  // Remove legacy single socket ref if present (migration)
  if (session.ws) {
      session.sockets.add(session.ws);
      session.ws = null;
  }

  session.lastActivity = Date.now();
  emitSessionMetadata(session, ws, resumed);
  
  if (resumed && session.buffer) {
    log('Sending session buffer to client', { sessionId: session.id, bufferSize: session.buffer.length });
    sendJSON(ws, { type: 'data', data: session.buffer });
  } else if (resumed) {
    log('Session buffer is empty', { sessionId: session.id });
  }
};

const handleConnection = (ws, request) => {
  const remote = request?.socket?.remoteAddress || 'unknown';
  log('WebSocket client connected', remote);
  let currentSessionId = null;

  const getCurrentSession = () => (currentSessionId ? getSession(currentSessionId) : null);

  const detachSession = () => {
    const session = getCurrentSession();
    if (session) {
        if (session.sockets) {
            session.sockets.delete(ws);
        }
        if (session.ws === ws) {
            session.ws = null;
        }
        session.lastActivity = Date.now();
    }
    currentSessionId = null;
  };

  const handleConnect = async (rawPayload) => {
    let payload = rawPayload;
    
    // Decrypt payload if it's encrypted (has 'payload' property or is a string)
    if (rawPayload.payload) {
       const decrypted = decrypt(rawPayload.payload);
       if (!decrypted) {
         sendJSON(ws, { type: 'error', message: 'Failed to decrypt connection payload.' });
         return;
       }
       try {
         payload = JSON.parse(decrypted);
       } catch (e) {
         sendJSON(ws, { type: 'error', message: 'Invalid encrypted payload.' });
         return;
       }
    }

    let { host, username, password, port = 22, token, connectionId } = payload;
    log('SSH connect requested', { remote, host, username, port, connectionId });

    if (currentSessionId) {
      sendJSON(ws, { type: 'error', message: 'A session is already active in this tab.' });
      return;
    }

    let auth;
    try {
      auth = await verifySocketAuth(token);
    } catch (err) {
      sendJSON(ws, { type: 'error', message: err.message });
      return;
    }

    // If connectionId is provided, fetch details from DB
    if (connectionId) {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM connections WHERE id = $1 AND user_id = $2',
          [connectionId, auth.userId]
        );
        if (rows.length) {
          const conn = rows[0];
          host = conn.host;
          username = conn.username;
          port = conn.port;
          if (conn.password) {
            password = decrypt(conn.password);
          }
        } else {
           sendJSON(ws, { type: 'error', message: 'Connection not found.' });
           return;
        }
      } catch (err) {
        log('Error fetching connection details', err);
        sendJSON(ws, { type: 'error', message: 'Database error.' });
        return;
      }
    }

    if (!host || !username || !password) {
      sendJSON(ws, {
        type: 'error',
        message: 'Host, username, and password are required.',
      });
      log('Missing SSH parameters from client', remote);
      return;
    }

    // Allow multiple sessions for the same connectionId (multitasking)
    // Previous cleanup logic removed to support user request.

    const session = {
      id: randomUUID(),
      userId: auth.userId,
      username,
      host,
      port,
      token,
      token,
      ws: null, // Deprecated
      sockets: new Set([ws]), // Initialize with current socket
      buffer: '',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      cleaned: false,
      sshClient: null,
      shellStream: null,
      connectionId: connectionId || null,
      cols: 80,
      rows: 24,
      width: 0,
      height: 0,
    };

    addSession(session);
    
    // Record session start
    pool.query(
      'INSERT INTO session_histories (user_id, connection_id, session_id, host, username, start_time) VALUES ($1, $2, $3, $4, $5, NOW())',
      [auth.userId, session.connectionId, session.id, host, username]
    ).catch(err => log('Error recording session start', err));

    currentSessionId = session.id;
    emitSessionMetadata(session, ws, false);

    const conn = new Client();
    session.sshClient = conn;

    conn.on('ready', () => {
      log('SSH Client :: ready', session.id);
      sendToSessionSocket(session, { type: 'status', message: 'Connected to host.' });

      const shellOptions = {
        term: 'xterm-256color',
        cols: session.cols || 80,
        rows: session.rows || 24,
      };
      if (session.width) shellOptions.width = session.width;
      if (session.height) shellOptions.height = session.height;

      conn.shell(shellOptions, (err, stream) => {
        if (err) {
          log('SSH Shell Error', err.message);
          sendToSessionSocket(session, { type: 'error', message: 'Failed to start shell: ' + err.message });
          cleanupSession(session, 'Shell error');
          return;
        }

        session.shellStream = stream;
        if (session.rows && session.cols) {
          try {
            stream.setWindow(session.rows, session.cols, session.height || session.rows, session.width || session.cols);
          } catch (resizeErr) {
            log('Initial setWindow failed', resizeErr.message);
          }
        }

        stream.on('close', () => {
          log('SSH Stream :: close', session.id);
          cleanupSession(session, 'Shell closed');
        });

        stream.on('data', (data) => {
          appendToSessionBuffer(session, data);
        });

        stream.stderr.on('data', (data) => {
          appendToSessionBuffer(session, data);
        });
      });
    });

    conn.on('error', (err) => {
      log('SSH Client Error', session.id, err.message);
      sendToSessionSocket(session, { type: 'error', message: 'SSH Connection Error: ' + err.message });
      cleanupSession(session, 'SSH Error');
    });

    conn.on('end', () => {
      log('SSH Client :: end', session.id);
      cleanupSession(session, 'SSH Connection Ended');
    });

    conn.on('close', () => {
      log('SSH Client :: close', session.id);
      cleanupSession(session, 'SSH Connection Closed');
    });

    try {
      conn.connect({
        host,
        port,
        username,
        password,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
      });
    } catch (err) {
      log('SSH Connect Exception', err.message);
      sendToSessionSocket(session, { type: 'error', message: 'Connection failed: ' + err.message });
      cleanupSession(session, 'Connection failed');
    }
  };

  const handleResume = async (resumePayload = {}) => {
    const { token, sessionId, id } = resumePayload;
    const targetSessionId = sessionId || id;

    if (!targetSessionId) {
      sendJSON(ws, { type: 'error', message: 'Session ID required to resume.' });
      return;
    }

    let auth;
    try {
      auth = await verifySocketAuth(token);
    } catch (err) {
      sendJSON(ws, { type: 'error', message: err.message });
      return;
    }

    const session = getSession(targetSessionId);
    if (!session || session.cleaned) {
      sendJSON(ws, { type: 'error', message: 'Session is no longer active.' });
      return;
    }

    if (session.userId !== auth.userId) {
      sendJSON(ws, { type: 'error', message: 'Not authorized to resume this session.' });
      return;
    }

    currentSessionId = session.id;
    attachSessionToSocket(session, ws, true);
    sendToSessionSocket(session, { type: 'status', message: 'Session resumed.' });
  };

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return; // Ignore invalid JSON
    }

    if (data.type === 'connect') {
      await handleConnect(data);
    } else if (data.type === 'resume') {
      await handleResume(data);
    } else if (data.type === 'replay') {
      const session = getCurrentSession();
      log('Replay requested', session?.id);
      if (session && session.buffer) {
        sendJSON(ws, { type: 'data', data: session.buffer });
      }
    } else if (data.type === 'input' || data.type === 'data') {
      const session = getCurrentSession();
      if (session && session.shellStream) {
        session.shellStream.write(data.data);
      }
    } else if (data.type === 'resize') {
      const session = getCurrentSession();
      if (session) {
        session.rows = data.rows || session.rows;
        session.cols = data.cols || session.cols;
        session.height = data.height || session.height;
        session.width = data.width || session.width;
        if (session.shellStream) {
          session.shellStream.setWindow(data.rows, data.cols, data.height, data.width);
        }
      }
    } else if (data.type === 'disconnect') {
      const session = getCurrentSession();
      if (session) {
        sendToSessionSocket(session, { type: 'status', message: 'Disconnecting session.' });
        cleanupSession(session, 'User requested disconnect.');
        currentSessionId = null;
      }
    } else if (data.type === 'ping') {
      // Keep-alive
    }
  });

  ws.on('close', () => {
    log('WebSocket client disconnected', remote);
    detachSession();
  });

  ws.on('error', (err) => {
    log('WebSocket error', remote, err.message);
    detachSession();
  });
};

module.exports = { handleConnection };

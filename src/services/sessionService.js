const { pool } = require('../lib/db');
const { log } = require('../utils/logger');
const { sendJSON } = require('../utils/websocket'); // We'll need to create this or pass it in

const sessions = new Map();
const MAX_SESSION_BUFFER = Number(process.env.SESSION_BUFFER_CHARS || 200000);

const getSession = (id) => sessions.get(id);
const getAllSessions = () => sessions.values();
const addSession = (session) => sessions.set(session.id, session);
const removeSession = (id) => sessions.delete(id);

const cleanupSession = (session, reason = 'SSH connection ended.') => {
  if (!session || session.cleaned) {
    return;
  }

  session.cleaned = true;

  if (session.shellStream) {
    try {
      session.shellStream.removeAllListeners();
      session.shellStream.end();
    } catch (err) {
      log('Error closing shell stream', err.message);
    }
    session.shellStream = null;
  }

  if (session.sshClient) {
    try {
      session.sshClient.removeAllListeners();
      // Attach a dummy error listener to prevent unhandled 'error' events during cleanup
      session.sshClient.on('error', (err) => {
        log('Ignored error during cleanup', session.id, err.message);
      });
      session.sshClient.end();
    } catch (err) {
      log('Error closing SSH connection', err.message);
    }
    session.sshClient = null;
  }

  if (session.sockets) {
      for (const ws of session.sockets) {
          if (ws.readyState === 1) {
              try {
                  ws.send(JSON.stringify({ type: 'status', message: reason }));
                  ws.close(1000, reason);
              } catch (e) {
                  // ignore
              }
          }
      }
      session.sockets.clear();
  }
  
  // Legacy cleanup
  if (session.ws && session.ws.readyState === 1) { 
    try {
        session.ws.send(JSON.stringify({ type: 'status', message: reason }));
        session.ws.close(1000, reason);
    } catch (e) {
        // ignore
    }
  }
  session.ws = null;

  // Update session history
  pool.query(
    'UPDATE session_histories SET end_time = NOW(), log_content = $1, status = $2 WHERE session_id = $3',
    [session.buffer, 'closed', session.id]
  ).catch(err => log('Error updating session history', err));

  sessions.delete(session.id);
  log('Cleaned up session', session.id, reason);
};

const terminateSessionsForToken = (token, reason) => {
  if (!token) return;
  const targets = [];
  for (const [id, session] of sessions.entries()) {
    if (session.token === token) {
      targets.push({ id, session });
    }
  }
  targets.forEach(({ session }) => cleanupSession(session, reason));
};

const terminateSessionsForUser = (userId, reason) => {
  if (!userId) return;
  const targets = [];
  for (const [id, session] of sessions.entries()) {
    if (session.userId === userId) {
      targets.push({ id, session });
    }
  }
  targets.forEach(({ session }) => cleanupSession(session, reason));
};

module.exports = {
  sessions,
  getSession,
  getAllSessions,
  addSession,
  removeSession,
  cleanupSession,
  terminateSessionsForToken,
  terminateSessionsForUser,
  MAX_SESSION_BUFFER
};

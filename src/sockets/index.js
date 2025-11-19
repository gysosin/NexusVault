const { WebSocketServer } = require('ws');
const { handleConnection } = require('./sshHandler');

const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ server });
  wss.on('connection', handleConnection);
  return wss;
};

module.exports = { initWebSocketServer };

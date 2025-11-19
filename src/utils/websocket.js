const WebSocket = require('ws');

const sendJSON = (ws, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

module.exports = { sendJSON };

require('dotenv').config();
const { createServer } = require('http');
const { initDb } = require('./src/lib/db');
const { log } = require('./src/utils/logger');
const { PORT } = require('./src/config/env');
const app = require('./src/app');
const { initWebSocketServer } = require('./src/sockets');

const httpServer = createServer(app);
initWebSocketServer(httpServer);

initDb().catch((err) => {
  log('Database initialization failed', err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});

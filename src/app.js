const express = require('express');
const path = require('path');
const cors = require('cors');
const { CORS_ORIGIN, NODE_ENV } = require('./config/env');
const { decryptPayload } = require('./middleware/security');

const authRouter = require('./routes/auth');
const connectionsRouter = require('./routes/connections');
const sessionsRouter = require('./routes/sessions');
const adminRouter = require('./routes/admin');

const app = express();

const corsOptions = {
  origin: CORS_ORIGIN || true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(decryptPayload);

app.use('/api/auth', authRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/admin', adminRouter);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const staticDir = path.join(__dirname, '..', 'public');

if (NODE_ENV !== 'development') {
  app.use(express.static(clientDist));
}
app.use(express.static(staticDir));

if (NODE_ENV !== 'development') {
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

module.exports = app;

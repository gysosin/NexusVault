# Web SSH Client

This project pairs a Node/Express backend (with [`ssh2`](https://github.com/mscdex/ssh2) and `ws`) with a modern React UI (Vite + xterm.js + Framer Motion). The browser collects SSH credentials, the backend opens the SSH session, and the two sides stream data over a WebSocket so you get a live terminal inside the page.

## Prerequisites

- Node.js 18+
- npm (for both the root project and the `client/` React app)

## Installation

```bash
# install backend deps
npm install

# install frontend deps
cd client
npm install
```

## Development workflow

```bash
npm run dev
```

This runs the Express/ssh2 backend (with `NODE_ENV=development`) and the Vite-powered React dev server in parallel, so the UI is available at `http://localhost:5173` and proxies WebSocket traffic to `ws://localhost:3000`. If you need custom ports, set `PORT` (for the backend) and adjust `client/vite.config.js` or export `VITE_SERVER_PORT`/`VITE_WS_ENDPOINT` before running the command.

## Production build

```bash
npm run build:client   # bundle the React UI into client/dist
npm start              # serve Express + built assets on PORT (default 3000)
```

Open `http://localhost:3000` (or whatever `PORT` you set) to use the app.

## Docker + services

This repo also ships with a Dockerfile and `docker-compose.yml` that bundle the Node app plus Postgres and Redis.

There is an `.env.example` next to the Compose stack; copy it to `.env`, adjust the hostnames if your containers expose non-default ports, and keep the `JWT_SECRET` value safe. For quick local development the example already points the app at `127.0.0.1` so the host-side Node process can reach the dockerized Postgres/Redis (restart `npm run dev` after editing), while the production compose overrides the hostnames so the backend connects to the containerized PostgreSQL/Redis services. Set `CORS_ORIGIN` if your frontend runs on a different domain so the server exposes the matching `Access-Control-Allow-Origin` header.

```bash
cp .env.example .env
```

The server now exposes a small auth API that stores users in Postgres, hashes passwords with bcrypt, issues JWTs, and tracks their sessions in Redis:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `{ username, email, password }` → creates a user |
| `POST` | `/api/auth/login` | `{ username|email, password }` → returns `{ token, user }` |
| `POST` | `/api/auth/logout` | Requires `Authorization: Bearer <token>` to expire the session |
| `GET` | `/api/auth/me` | Returns the current user when the token is valid |

Tokens live in Redis for one hour (`JWT_TTL`) so you can revoke them simply by deleting their keys (the logout endpoint already does this).

### Development compose

For a lightweight development infrastructure that only brings up Postgres and Redis (so you can run the UI/backend locally via `npm run dev`), use `docker-compose.dev.yml`:

```bash
docker compose -f docker-compose.dev.yml up
```

Once the infrastructure is ready, keep it running while you develop with `npm run dev` in another terminal (the app still connects to `localhost:5432`/`localhost:6379` via the env vars). This keeps the containers fast and focused on the services you need for testing without rebuilding the full image.

The original `docker-compose.yml` is still there for production-style builds once you’ve run `npm run build:client`.

```bash
cp .env.example .env   # adjust ports/credentials if needed
docker compose up --build
```

- `web`: Node/Express container that builds the React UI and exposes port 3000.
- `postgres`: stores persistent data (default creds `postgres / postgres`, DB `web_client`).
- `redis`: ready for caching/session/event use.

Adjust `DATABASE_URL` / `REDIS_URL` in `.env` or the compose file to fit your environment. The current app still keeps state in-memory, but the environment variables are wired so you can start integrating database/cache logic immediately.

## How it works

1. The React UI (client/) renders the credential form, terminal, and animated log panel with xterm.js.
2. Submitting the form opens a WebSocket to the backend and streams credentials via JSON.
3. The backend creates an SSH connection using `ssh2`, starts an interactive shell, and forwards stdout/stderr back to the browser in real time.
4. Keystrokes, resize events, and disconnects flow back over the WebSocket so the SSH shell behaves just like a native terminal.

## Security notes

- Credentials stay in-memory only; nothing is persisted.
- Run the app behind HTTPS/WSS so credentials are encrypted in transit.
- Restrict access to trusted users: the backend can reach any host it can network to.
- Extend the UI/backend before production use (e.g., private-key auth, user auth, auditing).

# NexusVault

<p align="center">
  <img src="client/public/nexusvault-logo.svg" alt="NexusVault Logo" width="200" height="200" />
</p>

<p align="center">
  <b>Secure, Modern Web-based SSH/RDP Client</b>
</p>

NexusVault is a web-based SSH/RDP client that bridges the browser to managed infrastructure. A Go/Gin backend serves authenticated APIs and WebSocket terminal streams, while a React/Vite frontend provides the terminal, RDP canvas, session management, and admin experience.

## 🚀 Features

- **Web-based SSH Terminal**: Full xterm.js integration for a native terminal feel.
- **Browser RDP Sessions**: RDP bitmap streaming over authenticated WebSockets.
- **Real-time Streaming**: WebSocket-based communication for low-latency interaction.
- **Secure Authentication**: JWT-backed API access with Redis session validation.
- **Modern UI**: Built with React, Vite, and Tailwind CSS (Shadcn UI) for a premium user experience.
- **Session Management**: Track and manage active SSH sessions.
- **Docker Ready**: Development and production Docker Compose files for PostgreSQL and Redis.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Shadcn UI, xterm.js, Framer Motion
- **Backend**: Go 1.24, Gin, gorilla/websocket, sqlx, go-redis
- **Remote Access**: `golang.org/x/crypto/ssh` and vendored `grdp`
- **Database/Cache**: PostgreSQL 16 and Redis 7

## 📋 Prerequisites

- Go 1.24+
- Node.js 18+ and npm for the frontend
- Docker and Docker Compose for local PostgreSQL/Redis

## 📦 Installation

1.  **Install Frontend Dependencies**
    ```bash
    cd client
    npm install
    ```

2.  **Create Environment File**
    ```bash
    cp .env.example .env
    ```

3.  **Set Required Secrets**
    - `JWT_SECRET`: long random string for API tokens.
    - `API_SECRET`: long random string for browser payload encryption. It must match `VITE_API_SECRET`.
    - `CREDENTIAL_SECRET`: long random server-only string for saved connection-password encryption. Keep it distinct from `API_SECRET`.
    - `VITE_API_SECRET`: frontend build-time payload encryption value. It must match `API_SECRET`, but because `VITE_` variables are bundled into browser JavaScript, it must not be treated as a private server-side secret.
    - `DATABASE_URL`: PostgreSQL connection string.
    - `REDIS_URL`: Redis connection string.
    - `ALLOWED_ORIGINS`: comma-separated browser origins allowed for CORS/WebSockets.
    - `ALLOW_PUBLIC_REGISTRATION`: set to `true` only when self-service signups are intended. Production defaults to first-user bootstrap only.
    - `AUTH_RATE_LIMIT_REQUESTS`: allowed login/register attempts per client IP window. Defaults to `10`.
    - `AUTH_RATE_LIMIT_WINDOW`: Go duration for the auth attempt window. Defaults to `1m`.
    - `TRUSTED_PROXIES`: optional comma-separated proxy IP/CIDR allowlist used for `X-Forwarded-For` client IP resolution. Leave unset unless deployed behind known reverse proxies.
    - `SSH_KNOWN_HOSTS_PATH`: OpenSSH `known_hosts` file used to verify SSH server keys.
    - `ALLOW_INSECURE_SSH_HOST_KEYS`: set to `true` only for local development or isolated test environments without host-key verification.
    - `VITE_API_TIMEOUT_MS`: optional frontend API request timeout in milliseconds. Defaults to `15000`.

## 💻 Development Workflow

Run the full development stack:

```bash
bash dev.sh
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000/api`
- **WebSockets**: `ws://localhost:3000/ws` and `ws://localhost:3000/ws/notifications`

Or run components separately:

```bash
docker compose -f docker-compose.dev.yml up -d
cd server && go run ./cmd/server
cd client && npm run dev
```

## 🏗️ Production Build

To build the application for production:

```bash
cd client && npm run build
cd ../server && go build ./cmd/server
```

Access the application at `http://localhost:3000`.

Production mode fails fast if `JWT_SECRET`, `API_SECRET`, `CREDENTIAL_SECRET`, `DATABASE_URL`, or `REDIS_URL` are missing or unsafe.
The first registered user bootstraps as `admin`; subsequent public registration is disabled in production unless `ALLOW_PUBLIC_REGISTRATION=true`.
Login and registration endpoints are rate limited per client IP. Tune `AUTH_RATE_LIMIT_REQUESTS` and `AUTH_RATE_LIMIT_WINDOW` for your threat model and reverse-proxy topology.

## 🐳 Docker Deployment

NexusVault includes a comprehensive Docker setup with PostgreSQL and Redis.

### Quick Start (Dev)

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

### Production

```bash
cp .env.example .env
openssl rand -base64 32 # use separate outputs for JWT_SECRET, API_SECRET, and CREDENTIAL_SECRET
docker compose up --build
```

Required production Compose variables:

- `DATABASE_URL`: for the bundled database, use `postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?sslmode=disable`.
- `REDIS_URL`: for the bundled cache, use `redis://redis:6379`.
- `JWT_SECRET`, `API_SECRET`, and `CREDENTIAL_SECRET`: unique random values of at least 32 characters.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`: credentials used to initialize the bundled PostgreSQL container.

Validate the rendered Compose model before deployment:

```bash
docker compose config --quiet
```

The bundled PostgreSQL container loads `server/schema.sql` only when its data volume is initialized for the first time. Existing volumes keep their current schema; apply future schema changes with a migration or recreate the volume only when data loss is acceptable.

## 📈 Operations

- `GET /api/health`: returns dependency status with HTTP 200 for dashboards and the in-app System Status page.
- `GET /api/ready`: returns HTTP 200 only when PostgreSQL and Redis are reachable; returns HTTP 503 when the app should be removed from traffic.
- Production Docker Compose uses `/api/ready` for the web container healthcheck.

## 🔐 Security

- **In-Memory Credentials**: SSH passwords/keys are held in memory only for the duration of the session.
- **Encrypted Transport**: Always run behind HTTPS/WSS in production.
- **Access Control**: API and WebSocket traffic requires a valid JWT-backed Redis session.
- **Origin Controls**: Configure `ALLOWED_ORIGINS` to match deployed browser origins.
- **Browser-Bundled Config**: `VITE_API_SECRET` is visible to users of the built frontend; use HTTPS/WSS for transport security and do not rely on browser-side payload encryption as a substitute.
- **Credential Encryption**: `CREDENTIAL_SECRET` protects stored connection passwords. Rotating it requires re-encrypting or recreating saved credentials encrypted with the previous value.
- **SSH Host Keys**: Production SSH sessions require `SSH_KNOWN_HOSTS_PATH` unless `ALLOW_INSECURE_SSH_HOST_KEYS=true` is explicitly set.
- **Secret Hygiene**: Never commit real `.env` files, API keys, JWT secrets, or encryption secrets.

## 📄 License

ISC

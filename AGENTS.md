# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

NexusVault is a web-based SSH/RDP client. Go backend (Gin) serves a React frontend and proxies terminal I/O over WebSockets.

## Development Commands

```bash
# Full dev environment (Docker DB/Redis + Go server + Vite frontend)
bash dev.sh

# Or run components individually:
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Redis
cd server && go run ./cmd/server                  # Backend on :3000
cd client && npm run dev                          # Frontend on :5173 (proxies /api and /ws to :3000)

# Frontend
cd client && npm run build      # Production build
cd client && npm run lint       # ESLint

# Backend
cd server && go build ./cmd/server   # Build
cd server && go test ./...           # Run all Go tests

# Manual API tests
bash test_api.sh
```

## Architecture

**Backend** (`server/`): Go 1.24, Gin framework, module name `go-server`.
- `cmd/server/main.go` — entry point, route registration, middleware setup
- `internal/api/` — HTTP handlers (auth, connections, sessions, admin, health)
- `internal/websocket/` — WebSocket handlers for SSH (`ssh.go`) and RDP (`rdp.go`) terminal sessions
- `internal/middleware/` — CORS, JWT auth (`AuthRequired`), request payload decryption
- `internal/service/` — session management, Redis pub/sub notifications
- `internal/models/` — data structs (User, Connection, SessionHistory, Role)
- `internal/db/` — PostgreSQL (sqlx) and Redis initialization
- `internal/config/` — env var loading via godotenv
- `internal/utils/` — JWT helpers, AES encryption, logging
- `third_party/grdp/` — vendored RDP protocol library (replaced via `go.mod replace`)
- `schema.sql` — PostgreSQL schema

**Frontend** (`client/`): React 18, Vite, Tailwind CSS, Shadcn UI (Radix primitives).
- `src/components/ui/` — reusable Shadcn UI primitives
- `src/components/session/` — terminal/session components (xterm.js)
- `src/components/admin/` — admin panel
- `src/pages/` — route pages (Dashboard, Login, Terminal, Status, Plan)
- `src/context/` — React Context for auth state
- `src/api/` — HTTP/fetch client functions
- `src/hooks/` — custom React hooks
- Path alias: `@/` maps to `src/`

**Infrastructure**: PostgreSQL 16, Redis 7. Docker Compose files for dev (`docker-compose.dev.yml`, DB+Redis only) and production (`docker-compose.yml`, includes web service).

## Key Patterns

- API routes are all under `/api` (auth, connections, sessions, admin, health)
- WebSocket endpoints: `/ws` (terminal sessions), `/ws/notifications` (real-time notifications via Redis pub/sub)
- JWT auth middleware: `middleware.AuthRequired()` — applied per route group, not globally
- SSH connections use `golang.org/x/crypto/ssh`; RDP uses the vendored `grdp` library
- Client-side encryption of sensitive payloads (crypto-js AES) decrypted by `DecryptPayloadMiddleware`
- Database queries use sqlx directly (no ORM)
- Frontend uses no router library or global state manager (React Context + hooks only)

## Environment

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT` (default 3000).

## Database Schema

Six tables: `users`, `connections`, `session_histories`, `activity_logs`, `roles`, `system_settings`. Schema defined in `server/schema.sql`.

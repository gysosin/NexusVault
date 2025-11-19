# NexusVault

<p align="center">
  <img src="client/public/nexusvault-logo.svg" alt="NexusVault Logo" width="200" height="200" />
</p>

<p align="center">
  <b>Secure, Modern Web-based SSH Client</b>
</p>

NexusVault is a powerful web-based SSH client that bridges the gap between your browser and your infrastructure. It pairs a robust Node.js/Express backend with a sleek, modern React UI to deliver a full-featured terminal experience directly in your web browser.

## 🚀 Features

- **Web-based SSH Terminal**: Full xterm.js integration for a native terminal feel.
- **Real-time Streaming**: WebSocket-based communication for low-latency interaction.
- **Secure Authentication**: SSH credentials are handled securely in memory.
- **Modern UI**: Built with React, Vite, and Tailwind CSS (Shadcn UI) for a premium user experience.
- **Session Management**: Track and manage active SSH sessions.
- **Docker Ready**: easy deployment with Docker and Docker Compose.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI, xterm.js, Framer Motion
- **Backend**: Node.js, Express, ssh2, ws (WebSocket)
- **Database**: PostgreSQL (for user data), Redis (for sessions/caching)

## 📋 Prerequisites

- Node.js 18+
- npm (for both root and `client/` workspace)
- Docker (optional, for containerized deployment)

## 📦 Installation

1.  **Install Backend Dependencies**
    ```bash
    npm install
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd client
    npm install
    ```

## 💻 Development Workflow

Run the development server (starts both backend and frontend):

```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:3000` (WebSockets at `ws://localhost:3000`)

## 🏗️ Production Build

To build the application for production:

```bash
npm run build:client   # Bundle React UI
npm start              # Start Express server
```

Access the application at `http://localhost:3000`.

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
docker compose up --build
```

## 🔐 Security

- **In-Memory Credentials**: SSH passwords/keys are held in memory only for the duration of the session.
- **Encrypted Transport**: Always run behind HTTPS/WSS in production.
- **Access Control**: Ensure the backend is only accessible to trusted networks.

## 📄 License

ISC


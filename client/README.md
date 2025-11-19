# NexusVault Client

<p align="center">
  <img src="public/nexusvault-logo.svg" alt="NexusVault Logo" width="150" height="150" />
</p>

The frontend application for **NexusVault**, a modern web-based SSH client. Built with React, Vite, and Tailwind CSS.

## 🚀 Tech Stack

- **Core**: React, Vite
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **Terminal**: xterm.js, xterm-addon-fit, xterm-addon-web-links
- **State Management**: React Hooks
- **Icons**: React Icons

## 🛠️ Development

To run the client in development mode (usually run via the root `npm run dev` command, but can be run independently if the backend is already running):

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## 📦 Build

To build the client for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 🧩 Key Components

- **Terminal**: A fully functional SSH terminal using xterm.js.
- **Session Manager**: Manage multiple active SSH sessions.
- **Connection Form**: Securely input SSH credentials.
- **Dashboard**: Overview of active sessions and saved connections.

## 📄 License

ISC


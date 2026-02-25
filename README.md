# ⚛ NEXUS Chat

A real-time Discord-style chat app with WebSockets, friend requests, DMs, and group channels. Built with React + Vite (frontend) and Express + Socket.IO + SQLite (backend).

---

## 🏗 Project Structure

```
nexus-chat/
├── index.html
├── vite.config.js
├── package.json              ← Frontend deps (React, Vite, Socket.IO client)
├── src/
│   ├── main.jsx
│   ├── App.jsx               ← Root layout, nav rail, toast
│   ├── lib/
│   │   ├── api.js            ← HTTP + Socket.IO client
│   │   ├── store.js          ← Zustand global state + socket bindings
│   │   └── theme.js          ← Colors, avatars, constants
│   └── components/
│       ├── AuthScreen.jsx    ← Register / Sign In
│       ├── Sidebar.jsx       ← Channels, DMs, Discover, Friends, Notifs
│       ├── ChatArea.jsx      ← Messages, input, typing indicator
│       └── MembersPanel.jsx  ← Online members list
└── server/
    ├── package.json          ← Server deps (Express, Socket.IO, SQLite, bcrypt)
    ├── index.js              ← Full server: REST API + WebSocket events
    └── data/
        └── nexus.db          ← SQLite DB (auto-created on first run)
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 2. Start the server

```bash
cd server
npm start
# → Server running on http://localhost:3001
```

### 3. Start the frontend (new terminal)

```bash
npm run dev
# → App running on http://localhost:5173
```

Open http://localhost:5173 — register an account and start chatting!

---

## 🌐 Multi-User Setup (LAN / Internet)

To let people on **other machines** connect:

### Local Network (LAN)

1. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Create a `.env` file in the project root:
   ```env
   VITE_SERVER_URL=http://YOUR_LOCAL_IP:3001
   ```
3. Rebuild the frontend: `npm run build && npm run preview`
4. Tell friends to open `http://YOUR_LOCAL_IP:4173`
5. Run the server with: `cd server && node index.js`

### Public Internet (Deploy)

#### Option A — Railway (easiest, free tier)
1. Push the project to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Deploy the `server/` folder as a Node.js service
4. Set `PORT` env var in Railway dashboard
5. Copy the Railway public URL (e.g. `https://nexus-chat.up.railway.app`)
6. Set `VITE_SERVER_URL=https://your-railway-url` in Vite's env
7. Deploy the frontend to [Vercel](https://vercel.com) or [Netlify](https://netlify.com)

#### Option B — Render (free tier)
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `server`
4. Set **Start Command** to `node index.js`
5. Add env var `PORT=3001`
6. Deploy frontend separately with `VITE_SERVER_URL` set to your Render URL

#### Option C — VPS (full control)
```bash
# On your server
git clone your-repo && cd nexus-chat/server
npm install --production
node index.js &   # or use pm2

# Frontend — build and serve with nginx
cd ..
VITE_SERVER_URL=https://your-domain.com npm run build
# Copy dist/ to nginx web root
```

---

## ✅ Features

| Feature | Implementation |
|---|---|
| **Real-time messages** | Socket.IO `send_message` / `new_message` events |
| **Online presence** | Socket.IO connect/disconnect + in-memory Map |
| **Typing indicators** | Socket.IO `typing` / `user_typing` events with auto-clear |
| **Friend requests** | REST + Socket.IO — request sent live if recipient is online |
| **Direct messages** | Dedicated DM channel auto-created on first open |
| **Group channels** | Create channels — broadcast to all users via `channel_created` |
| **Persistent data** | SQLite via `better-sqlite3` — survives server restarts |
| **Secure passwords** | `bcryptjs` with salt rounds = 10 |

---

## 🔧 Cursor AI Tips

Open this project in Cursor and try prompts like:

- *"Add message reactions with emoji picker"*
- *"Add image/file upload support"*
- *"Add message search across channels"*
- *"Add channel roles (admin, member)"*
- *"Add push notifications when mentioned"*
- *"Replace SQLite with PostgreSQL"*
- *"Add end-to-end encryption for DMs"*
- *"Deploy this with Docker Compose"*

---

## 📦 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Zustand |
| Styling | Pure CSS-in-JS (no extra libs) |
| Real-time | Socket.IO |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Auth | bcryptjs |
| Fonts | Bricolage Grotesque + Instrument Sans |

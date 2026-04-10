# 🚀 CodeSync — Real-Time Collaborative Code Editor

A production-ready, full-stack collaborative code editor platform. Multiple users can join a room, edit code simultaneously in real time, with full JWT authentication, role-based access control, and persistent storage.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Real-Time Sync** | Socket.IO broadcasts every keystroke to all room members instantly |
| **Monaco Editor** | VS Code's editor engine with syntax highlighting for 6+ languages |
| **JWT Auth** | Secure signup/login with token-based sessions |
| **Role-Based Access** | `owner`, `editor`, `viewer` — viewers are read-only |
| **Auto-Save** | Debounced (1s) auto-save of code to MongoDB |
| **Activity History** | Last 50 code snapshots stored per session |
| **Active Users** | See who's currently in the room, live |
| **Room Management** | Create, join, list, and delete rooms from the dashboard |
| **Language Support** | JavaScript, TypeScript, Python, Java, C++, HTML |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** — UI framework
- **Tailwind CSS** — Utility-first styling
- **Monaco Editor** (`@monaco-editor/react`) — Code editor
- **Socket.IO Client** — Real-time communication
- **Axios** — HTTP client with JWT interceptors
- **React Router v6** — Client-side routing

### Backend
- **Node.js + Express** — REST API server
- **Socket.IO** — WebSocket server
- **MongoDB + Mongoose** — Database & ODM
- **JWT (jsonwebtoken)** — Authentication
- **bcryptjs** — Password hashing

---

## 📁 Project Structure

```
project-root/
├── package.json              # Root: concurrently script
│
├── client/                   # React frontend
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js            # Routes + Auth provider
│   │   ├── index.js          # Entry point
│   │   ├── index.css         # Tailwind + global styles
│   │   ├── context/
│   │   │   └── AuthContext.js        # Global auth state
│   │   ├── components/
│   │   │   ├── Navbar.js             # Top navigation bar
│   │   │   ├── ProtectedRoute.js     # Route guard
│   │   │   └── UsersPanel.js         # Live users sidebar
│   │   ├── pages/
│   │   │   ├── Landing.js            # Marketing / home page
│   │   │   ├── Login.js              # Sign in
│   │   │   ├── Signup.js             # Register
│   │   │   ├── Dashboard.js          # Room management
│   │   │   └── Editor.js             # Real-time Monaco editor
│   │   └── utils/
│   │       ├── api.js                # Axios instance
│   │       └── socket.js             # Socket.IO singleton
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── server/                   # Node.js backend
    ├── server.js             # Entry: Express + Socket.IO
    ├── config/
    │   └── db.js             # MongoDB connection
    ├── models/
    │   ├── User.js           # User schema
    │   ├── Room.js           # Room + members schema
    │   └── CodeSession.js    # Code + history schema
    ├── controllers/
    │   ├── authController.js # signup, login, getMe
    │   ├── roomController.js # CRUD for rooms
    │   └── sessionController.js # Code session access
    ├── routes/
    │   ├── auth.js
    │   ├── rooms.js
    │   └── sessions.js
    ├── middleware/
    │   └── auth.js           # JWT protect middleware
    ├── sockets/
    │   └── socketHandler.js  # All Socket.IO event logic
    └── package.json
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### 1. Clone & Install

```bash
git clone https://github.com/yourname/collaborative-code-editor.git
cd collaborative-code-editor

# Install all dependencies (root + client + server)
npm run install:all
```

### 2. Configure Environment Variables

**Server** — copy and edit:
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Client** — copy and edit:
```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 3. Run the App

From the **root** directory:
```bash
npm run dev
```

This runs both client (port 3000) and server (port 5000) concurrently.

Or run them separately:
```bash
# Terminal 1
npm run server

# Terminal 2
npm run client
```

### 4. Open in Browser

Visit [http://localhost:3000](http://localhost:3000)

---

## 🔌 Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client → Server | `{ roomId, userName, userEmail }` | Join a collaboration room |
| `sync-code` | Server → Client | `{ code, language }` | Send current code on join |
| `code-change` | Client → Server | `{ roomId, code, language }` | Local code change |
| `code-update` | Server → Client | `{ code, language, sentBy }` | Broadcast code to others |
| `language-change` | Client → Server | `{ roomId, language }` | Change editor language |
| `language-update` | Server → Client | `{ language }` | Broadcast language change |
| `user-joined` | Server → Client | `{ name, role, activeUsers }` | A user entered the room |
| `user-left` | Server → Client | `{ name, activeUsers }` | A user left the room |
| `cursor-move` | Client → Server | `{ roomId, position }` | Cursor presence (optional) |

---

## 🔐 REST API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |

### Rooms
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/rooms/create` | ✅ | Create a new room |
| POST | `/api/rooms/join` | ✅ | Join room by ID |
| GET | `/api/rooms/my-rooms` | ✅ | List user's rooms |
| GET | `/api/rooms/:roomId` | ✅ | Get room + session |
| PATCH | `/api/rooms/:roomId/role` | ✅ | Change member role |
| DELETE | `/api/rooms/:roomId` | ✅ | Delete room (owner only) |

### Sessions
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/sessions/:roomId` | ✅ | Get current code |
| GET | `/api/sessions/:roomId/history` | ✅ | Get change history |

---

## 🗄️ Database Models

### User
```js
{ name, email, password (hashed), role: 'user'|'admin', timestamps }
```

### Room
```js
{
  roomId, name, description, language,
  isPrivate, isActive, createdBy,
  members: [{ userId, name, email, role: 'owner'|'editor'|'viewer' }]
}
```

### CodeSession
```js
{
  roomId, code, language,
  lastUpdatedBy, lastUpdated,
  history: [{ userId, userName, code, timestamp }]  // capped at 50
}
```

---

## 🎭 Role Permissions

| Permission | Owner | Editor | Viewer |
|---|:---:|:---:|:---:|
| Edit code | ✅ | ✅ | ❌ |
| Change language | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| Delete room | ✅ | ❌ | ❌ |
| View code | ✅ | ✅ | ✅ |

---

## 🏭 Production Deployment

### Build the frontend
```bash
npm run build
```

### Serve static files from Express (add to `server.js`):
```js
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});
```

### Environment
Set `NODE_ENV=production` and use a strong random `JWT_SECRET`.

### Recommended Platforms
- **Server**: Railway, Render, Fly.io, AWS EC2
- **Database**: MongoDB Atlas (free tier available)
- **Frontend**: Vercel, Netlify, or same server

---

## 🔧 Development Notes

- **Debounce**: Code updates are debounced at 1s on the server before saving to MongoDB. The client emits on every change.
- **Reconnection**: Socket.IO is configured for 5 automatic reconnection attempts with 1s delay.
- **Echo prevention**: The `isRemoteChange` ref prevents the editor from re-emitting code received from other users.
- **JWT expiry**: Tokens expire in 7 days. The Axios interceptor auto-redirects to `/login` on 401.

---

## 📄 License

MIT — feel free to use, modify, and distribute.

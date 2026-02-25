const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const { v4: uuid } = require('uuid');
const path         = require('path');
const fs           = require('fs');
const initSqlJs    = require('sql.js');

/* ─── Setup ──────────────────────────────────────────────────────────────── */
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({origin: '*'}));
app.use(express.json());

const PORT    = process.env.PORT || 3001;
const DB_DIR  = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'nexus.db');

/* ─── Database (sql.js — pure JavaScript, zero native compilation) ───────── */
let db;

function saveDb() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// Auto-save every 10 seconds
setInterval(saveDb, 10_000);
process.on('exit',    saveDb);
process.on('SIGINT',  () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

async function initDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('✓ Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('✓ Created new database');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar        TEXT NOT NULL DEFAULT '🦋',
      color         TEXT NOT NULL DEFAULT '#4f6ef7',
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS channels (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      icon        TEXT NOT NULL DEFAULT '🌐',
      description TEXT NOT NULL DEFAULT '',
      is_dm       INTEGER NOT NULL DEFAULT 0,
      created_by  TEXT,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id         TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      author_id  TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      PRIMARY KEY (channel_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS friends (
      user_id   TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      PRIMARY KEY (user_id, friend_id)
    );
    CREATE TABLE IF NOT EXISTS friend_requests (
      id         TEXT PRIMARY KEY,
      from_id    TEXT NOT NULL,
      to_id      TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      UNIQUE (from_id, to_id)
    );
  `);

  // Seed default channels
  const seeds = [
    ['ch_general', 'general',   '🌐', 'Talk about anything'],
    ['ch_vibes',   'vibes',     '🎵', 'Music & good energy'],
    ['ch_tech',    'tech-talk', '💻', 'Dev stuff & nerd talk'],
    ['ch_gaming',  'gaming',    '🎮', 'Games & trash talk'],
    ['ch_random',  'random',    '🎲', 'Chaos welcome'],
  ];
  for (const [id, name, icon, desc] of seeds) {
    db.run('INSERT OR IGNORE INTO channels (id,name,icon,description,is_dm) VALUES (?,?,?,?,0)',
      [id, name, icon, desc]);
  }

  saveDb();
  console.log('✓ Database ready');
}

/* ─── DB helpers ─────────────────────────────────────────────────────────── */
function dbAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) {
    console.error('dbAll error:', e.message);
    return [];
  }
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
}

/* ─── Online presence ────────────────────────────────────────────────────── */
const online = new Map(); // userId → socketId

/* ══════════════════════════════════════════════════════════════════════════
   REST API
══════════════════════════════════════════════════════════════════════════ */

app.post('/api/register', async (req, res) => {
  const { username, password, avatar, color } = req.body;
  if (!username?.trim() || !password)    return res.status(400).json({ error: 'Missing fields' });
  if (username.trim().length < 2)        return res.status(400).json({ error: 'Username must be 2+ characters' });
  if (password.length < 4)              return res.status(400).json({ error: 'Password must be 4+ characters' });
  if (dbGet('SELECT id FROM users WHERE LOWER(username)=LOWER(?)', [username.trim()]))
    return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  const id   = uuid().replace(/-/g, '').slice(0, 10);
  dbRun('INSERT INTO users (id,username,password_hash,avatar,color) VALUES (?,?,?,?,?)',
    [id, username.trim(), hash, avatar || '🦋', color || '#4f6ef7']);
  saveDb();
  res.json({ user: dbGet('SELECT id,username,avatar,color,created_at FROM users WHERE id=?', [id]) });
});

app.post('/api/login', async (req, res) => {
  const row = dbGet('SELECT * FROM users WHERE LOWER(username)=LOWER(?)', [req.body.username?.trim() || '']);
  if (!row) return res.status(401).json({ error: 'Wrong username or password' });
  if (!await bcrypt.compare(req.body.password, row.password_hash))
    return res.status(401).json({ error: 'Wrong username or password' });
  const { password_hash, ...user } = row;
  res.json({ user });
});

app.get('/api/channels', (_, res) =>
  res.json(dbAll('SELECT * FROM channels WHERE is_dm=0 ORDER BY created_at')));

app.get('/api/channels/:id/messages', (req, res) =>
  res.json(dbAll(`
    SELECT m.id, m.channel_id, m.author_id, m.content, m.created_at,
           u.username, u.avatar, u.color
    FROM messages m JOIN users u ON u.id=m.author_id
    WHERE m.channel_id=? ORDER BY m.created_at ASC LIMIT 100
  `, [req.params.id])));

app.get('/api/users/search', (req, res) =>
  res.json(dbAll(
    'SELECT id,username,avatar,color FROM users WHERE username LIKE ? ORDER BY username LIMIT 30',
    [`%${req.query.q || ''}%`]
  )));

app.get('/api/users', (_, res) =>
  res.json(dbAll('SELECT id,username,avatar,color FROM users ORDER BY username')));

app.get('/api/users/:id/friends', (req, res) =>
  res.json(dbAll(`
    SELECT u.id,u.username,u.avatar,u.color
    FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=?
  `, [req.params.id])));

app.get('/api/users/:id/requests', (req, res) =>
  res.json(dbAll(`
    SELECT fr.id, fr.from_id, fr.to_id, fr.created_at,
           u.username, u.avatar, u.color
    FROM friend_requests fr JOIN users u ON u.id=fr.from_id WHERE fr.to_id=?
  `, [req.params.id])));

app.post('/api/dm', (req, res) => {
  const { userA, userB } = req.body;
  const dmId = 'dm_' + [userA, userB].sort().join('_');
  if (!dbGet('SELECT id FROM channels WHERE id=?', [dmId])) {
    dbRun('INSERT INTO channels (id,name,icon,is_dm,created_by) VALUES (?,?,?,1,?)',
      [dmId, dmId, '💬', userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)', [dmId, userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)', [dmId, userB]);
    saveDb();
  }
  res.json({
    channel: dbGet('SELECT * FROM channels WHERE id=?', [dmId]),
    messages: dbAll(`
      SELECT m.id, m.channel_id, m.author_id, m.content, m.created_at,
             u.username, u.avatar, u.color
      FROM messages m JOIN users u ON u.id=m.author_id
      WHERE m.channel_id=? ORDER BY m.created_at ASC LIMIT 100
    `, [dmId]),
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SOCKET.IO
══════════════════════════════════════════════════════════════════════════ */
io.on('connection', (socket) => {
  let currentUser = null;
  let currentRoom = null;

  socket.on('auth', ({ userId }) => {
    currentUser = dbGet('SELECT id,username,avatar,color FROM users WHERE id=?', [userId]);
    if (!currentUser) return;
    online.set(userId, socket.id);
    io.emit('online_update', Array.from(online.keys()));
    console.log(`✓ ${currentUser.username} connected  (${online.size} online)`);
  });

  socket.on('join_channel', ({ channelId }) => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = channelId;
    socket.join(channelId);
  });

  socket.on('send_message', ({ channelId, content }) => {
    if (!currentUser || !content?.trim()) return;
    const id = uuid().replace(/-/g, '').slice(0, 12);
    const ts = Math.floor(Date.now() / 1000);
    dbRun('INSERT INTO messages (id,channel_id,author_id,content,created_at) VALUES (?,?,?,?,?)',
      [id, channelId, currentUser.id, content.trim(), ts]);
    saveDb();
    io.to(channelId).emit('new_message', {
      id, channel_id: channelId, author_id: currentUser.id,
      content: content.trim(), created_at: ts,
      username: currentUser.username,
      avatar:   currentUser.avatar,
      color:    currentUser.color,
    });
  });

  socket.on('send_friend_request', ({ toId }) => {
    if (!currentUser) return;
    if (dbGet('SELECT 1 FROM friends WHERE user_id=? AND friend_id=?', [currentUser.id, toId]))
      return socket.emit('error', 'Already friends!');
    if (dbGet('SELECT 1 FROM friend_requests WHERE from_id=? AND to_id=?', [currentUser.id, toId]))
      return socket.emit('error', 'Request already sent');

    const id = uuid().replace(/-/g, '').slice(0, 10);
    const ts = Math.floor(Date.now() / 1000);
    try {
      dbRun('INSERT INTO friend_requests (id,from_id,to_id,created_at) VALUES (?,?,?,?)',
        [id, currentUser.id, toId, ts]);
      saveDb();
    } catch { return socket.emit('error', 'Could not send request'); }

    const reqData = { id, from_id: currentUser.id, to_id: toId, created_at: ts,
      username: currentUser.username, avatar: currentUser.avatar, color: currentUser.color };
    const toSocket = online.get(toId);
    if (toSocket) io.to(toSocket).emit('friend_request', reqData);
    socket.emit('request_sent', reqData);
  });

  socket.on('accept_request', ({ requestId, fromId }) => {
    if (!currentUser) return;
    dbRun('DELETE FROM friend_requests WHERE id=?', [requestId]);
    dbRun('INSERT OR IGNORE INTO friends (user_id,friend_id) VALUES (?,?)', [currentUser.id, fromId]);
    dbRun('INSERT OR IGNORE INTO friends (user_id,friend_id) VALUES (?,?)', [fromId, currentUser.id]);
    saveDb();
    socket.emit('friend_added', dbGet('SELECT id,username,avatar,color FROM users WHERE id=?', [fromId]));
    const fromSocket = online.get(fromId);
    if (fromSocket) io.to(fromSocket).emit('friend_added',
      dbGet('SELECT id,username,avatar,color FROM users WHERE id=?', [currentUser.id]));
  });

  socket.on('decline_request', ({ requestId }) => {
    dbRun('DELETE FROM friend_requests WHERE id=?', [requestId]);
    saveDb();
    socket.emit('request_declined', { requestId });
  });

  socket.on('create_channel', ({ name, icon, description }) => {
    if (!currentUser) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const id   = 'ch_' + uuid().replace(/-/g, '').slice(0, 8);
    const ts   = Math.floor(Date.now() / 1000);
    dbRun('INSERT INTO channels (id,name,icon,description,is_dm,created_by,created_at) VALUES (?,?,?,?,0,?,?)',
      [id, slug, icon || '✨', description || '', currentUser.id, ts]);
    saveDb();
    io.emit('channel_created', dbGet('SELECT * FROM channels WHERE id=?', [id]));
    socket.emit('channel_joined', { channelId: id });
  });

  socket.on('typing', ({ channelId, isTyping }) => {
    if (!currentUser) return;
    socket.to(channelId).emit('user_typing', {
      userId: currentUser.id, username: currentUser.username, isTyping,
    });
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      online.delete(currentUser.id);
      io.emit('online_update', Array.from(online.keys()));
      console.log(`✗ ${currentUser.username} disconnected  (${online.size} online)`);
    }
  });
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
initDb().then(() => {
  server.listen(PORT, () =>
    console.log(`\n⚛  NEXUS Chat server → http://localhost:${PORT}\n`));
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

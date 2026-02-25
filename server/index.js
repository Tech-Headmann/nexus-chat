const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const bcrypt       = require('bcryptjs');
const { v4: uuid } = require('uuid');
const path         = require('path');
const fs           = require('fs');
const initSqlJs    = require('sql.js');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());

const PORT    = process.env.PORT || 3001;
const DB_DIR  = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'nexus.db');

/* ─── Database ───────────────────────────────────────────────────────────── */
let db;

function saveDb() {
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
  catch (e) { console.error('DB save error:', e.message); }
}
setInterval(saveDb, 10_000);
process.on('exit',    saveDb);
process.on('SIGINT',  () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

async function initDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🦋',
      color TEXT NOT NULL DEFAULT '#4f6ef7',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🌐', description TEXT NOT NULL DEFAULT '',
      is_dm INTEGER NOT NULL DEFAULT 0, created_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, channel_id TEXT NOT NULL,
      author_id TEXT NOT NULL, content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id TEXT NOT NULL, user_id TEXT NOT NULL,
      PRIMARY KEY (channel_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS friends (
      user_id TEXT NOT NULL, friend_id TEXT NOT NULL,
      PRIMARY KEY (user_id, friend_id)
    );
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      UNIQUE (from_id, to_id)
    );
  `);

  const seeds = [
    ['ch_general','general','🌐','Talk about anything'],
    ['ch_vibes',  'vibes',  '🎵','Music & good energy'],
    ['ch_tech',   'tech-talk','💻','Dev stuff & nerd talk'],
    ['ch_gaming', 'gaming', '🎮','Games & trash talk'],
    ['ch_random', 'random', '🎲','Chaos welcome'],
  ];
  for (const [id, name, icon, desc] of seeds)
    db.run('INSERT OR IGNORE INTO channels (id,name,icon,description,is_dm) VALUES (?,?,?,?,0)', [id,name,icon,desc]);

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
  } catch (e) { console.error('dbAll:', e.message); return []; }
}
const dbGet = (sql, p = []) => dbAll(sql, p)[0] || null;
const dbRun = (sql, p = []) => db.run(sql, p);

/* ─── In-memory state ────────────────────────────────────────────────────── */
const online    = new Map();  // userId → socketId
const voiceRooms = new Map(); // channelId → Set of { userId, socketId, username, avatar }

/* ══════════════════════════════════════════════════════════════════════════
   REST API
══════════════════════════════════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
  const { username, password, avatar, color } = req.body;
  if (!username?.trim() || !password)  return res.status(400).json({ error: 'Missing fields' });
  if (username.trim().length < 2)      return res.status(400).json({ error: 'Username must be 2+ characters' });
  if (password.length < 4)            return res.status(400).json({ error: 'Password must be 4+ characters' });
  if (dbGet('SELECT id FROM users WHERE LOWER(username)=LOWER(?)', [username.trim()]))
    return res.status(409).json({ error: 'Username already taken' });

  const hash = await bcrypt.hash(password, 10);
  const id   = uuid().replace(/-/g,'').slice(0,10);
  dbRun('INSERT INTO users (id,username,password_hash,avatar,color) VALUES (?,?,?,?,?)',
    [id, username.trim(), hash, avatar||'🦋', color||'#4f6ef7']);
  saveDb();
  res.json({ user: dbGet('SELECT id,username,avatar,color,created_at FROM users WHERE id=?', [id]) });
});

app.post('/api/login', async (req, res) => {
  const row = dbGet('SELECT * FROM users WHERE LOWER(username)=LOWER(?)', [req.body.username?.trim()||'']);
  if (!row || !await bcrypt.compare(req.body.password, row.password_hash))
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
  res.json(dbAll('SELECT id,username,avatar,color FROM users WHERE username LIKE ? ORDER BY username LIMIT 30',
    [`%${req.query.q||''}%`])));

app.get('/api/users',           (_, res) => res.json(dbAll('SELECT id,username,avatar,color FROM users ORDER BY username')));
app.get('/api/users/:id/friends',  (req, res) => res.json(dbAll(`SELECT u.id,u.username,u.avatar,u.color FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=?`, [req.params.id])));
app.get('/api/users/:id/requests', (req, res) => res.json(dbAll(`SELECT fr.id,fr.from_id,fr.to_id,fr.created_at,u.username,u.avatar,u.color FROM friend_requests fr JOIN users u ON u.id=fr.from_id WHERE fr.to_id=?`, [req.params.id])));

app.post('/api/dm', (req, res) => {
  const { userA, userB } = req.body;
  const dmId = 'dm_' + [userA, userB].sort().join('_');
  if (!dbGet('SELECT id FROM channels WHERE id=?', [dmId])) {
    dbRun('INSERT INTO channels (id,name,icon,is_dm,created_by) VALUES (?,?,?,1,?)', [dmId, dmId, '💬', userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)', [dmId, userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)', [dmId, userB]);
    saveDb();
  }
  res.json({
    channel:  dbGet('SELECT * FROM channels WHERE id=?', [dmId]),
    messages: dbAll(`SELECT m.id,m.channel_id,m.author_id,m.content,m.created_at,u.username,u.avatar,u.color FROM messages m JOIN users u ON u.id=m.author_id WHERE m.channel_id=? ORDER BY m.created_at ASC LIMIT 100`, [dmId]),
  });
});

/* ── Voice room state endpoint ── */
app.get('/api/voice/:channelId', (req, res) => {
  const room = voiceRooms.get(req.params.channelId);
  res.json(room ? Array.from(room) : []);
});

/* ══════════════════════════════════════════════════════════════════════════
   SOCKET.IO
══════════════════════════════════════════════════════════════════════════ */
io.on('connection', (socket) => {
  let currentUser = null;
  let currentRoom = null;
  let inVoiceChannel = null;

  /* ── Auth ── */
  socket.on('auth', ({ userId }) => {
    currentUser = dbGet('SELECT id,username,avatar,color FROM users WHERE id=?', [userId]);
    if (!currentUser) return;
    online.set(userId, socket.id);
    io.emit('online_update', Array.from(online.keys()));
    console.log(`✓ ${currentUser.username} connected (${online.size} online)`);
  });

  /* ── Join text channel ── */
  socket.on('join_channel', ({ channelId }) => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = channelId;
    socket.join(channelId);
  });

  /* ── Send message ── */
  socket.on('send_message', ({ channelId, content }) => {
    if (!currentUser || !content?.trim()) return;
    const id = uuid().replace(/-/g,'').slice(0,12);
    const ts = Math.floor(Date.now() / 1000);
    dbRun('INSERT INTO messages (id,channel_id,author_id,content,created_at) VALUES (?,?,?,?,?)',
      [id, channelId, currentUser.id, content.trim(), ts]);
    saveDb();
    io.to(channelId).emit('new_message', {
      id, channel_id: channelId, author_id: currentUser.id,
      content: content.trim(), created_at: ts,
      username: currentUser.username, avatar: currentUser.avatar, color: currentUser.color,
    });
  });

  /* ── Delete channel ── */
  socket.on('delete_channel', ({ channelId }) => {
    if (!currentUser) return;
    const chan = dbGet('SELECT * FROM channels WHERE id=?', [channelId]);
    if (!chan) return socket.emit('error', 'Channel not found');
    // Only creator or if no creator (legacy) can delete; default channels are protected
    const defaultIds = ['ch_general','ch_vibes','ch_tech','ch_gaming','ch_random'];
    if (defaultIds.includes(channelId)) return socket.emit('error', 'Default channels cannot be deleted');
    if (chan.created_by && chan.created_by !== currentUser.id)
      return socket.emit('error', 'Only the channel creator can delete it');

    dbRun('DELETE FROM messages WHERE channel_id=?', [channelId]);
    dbRun('DELETE FROM channel_members WHERE channel_id=?', [channelId]);
    dbRun('DELETE FROM channels WHERE id=?', [channelId]);
    saveDb();
    io.emit('channel_deleted', { channelId });
    console.log(`🗑 Channel ${chan.name} deleted by ${currentUser.username}`);
  });

  /* ── Typing ── */
  socket.on('typing', ({ channelId, isTyping }) => {
    if (!currentUser) return;
    socket.to(channelId).emit('user_typing', {
      userId: currentUser.id, username: currentUser.username, isTyping,
    });
  });

  /* ── Friend requests ── */
  socket.on('send_friend_request', ({ toId }) => {
    if (!currentUser) return;
    if (dbGet('SELECT 1 FROM friends WHERE user_id=? AND friend_id=?', [currentUser.id, toId]))
      return socket.emit('error', 'Already friends!');
    if (dbGet('SELECT 1 FROM friend_requests WHERE from_id=? AND to_id=?', [currentUser.id, toId]))
      return socket.emit('error', 'Request already sent');
    const id = uuid().replace(/-/g,'').slice(0,10);
    const ts = Math.floor(Date.now() / 1000);
    try { dbRun('INSERT INTO friend_requests (id,from_id,to_id,created_at) VALUES (?,?,?,?)', [id, currentUser.id, toId, ts]); saveDb(); }
    catch { return socket.emit('error', 'Could not send request'); }
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
    if (fromSocket) io.to(fromSocket).emit('friend_added', dbGet('SELECT id,username,avatar,color FROM users WHERE id=?', [currentUser.id]));
  });

  socket.on('decline_request', ({ requestId }) => {
    dbRun('DELETE FROM friend_requests WHERE id=?', [requestId]);
    saveDb();
    socket.emit('request_declined', { requestId });
  });

  socket.on('create_channel', ({ name, icon, description }) => {
    if (!currentUser) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const id   = 'ch_' + uuid().replace(/-/g,'').slice(0,8);
    const ts   = Math.floor(Date.now() / 1000);
    dbRun('INSERT INTO channels (id,name,icon,description,is_dm,created_by,created_at) VALUES (?,?,?,?,0,?,?)',
      [id, slug, icon||'✨', description||'', currentUser.id, ts]);
    saveDb();
    io.emit('channel_created', dbGet('SELECT * FROM channels WHERE id=?', [id]));
    socket.emit('channel_joined', { channelId: id });
  });

  /* ════════════════════════════════════════════════════════════════════════
     VOICE CALL SIGNALING (WebRTC)
     
     Flow:
     1. User A joins voice room → server tells everyone else in room
     2. Existing users in room send WebRTC "offer" to User A
     3. User A replies with "answer"
     4. Both exchange ICE candidates
     5. WebRTC peer connection established (audio flows directly peer-to-peer)
  ════════════════════════════════════════════════════════════════════════ */

  socket.on('voice_join', ({ channelId }) => {
    if (!currentUser) return;

    if (!voiceRooms.has(channelId)) voiceRooms.set(channelId, new Set());
    const room = voiceRooms.get(channelId);

    // Tell this user who is already in the room (so they can initiate offers)
    const existingPeers = Array.from(room).map(p => ({
      userId:   p.userId,
      socketId: p.socketId,
      username: p.username,
      avatar:   p.avatar,
      color:    p.color,
    }));
    socket.emit('voice_peers', existingPeers);

    // Add this user to the room
    room.add({
      userId:   currentUser.id,
      socketId: socket.id,
      username: currentUser.username,
      avatar:   currentUser.avatar,
      color:    currentUser.color,
    });

    inVoiceChannel = channelId;

    // Tell everyone else in the room that a new peer joined
    socket.to(channelId).emit('voice_peer_joined', {
      userId:   currentUser.id,
      socketId: socket.id,
      username: currentUser.username,
      avatar:   currentUser.avatar,
      color:    currentUser.color,
    });

    socket.join(`voice_${channelId}`);

    // Broadcast updated voice room state to everyone in the channel
    io.to(channelId).emit('voice_room_update', { channelId, peers: Array.from(room) });
    console.log(`🎙 ${currentUser.username} joined voice in ${channelId} (${room.size} in room)`);
  });

  socket.on('voice_leave', ({ channelId }) => {
    leaveVoice(channelId);
  });

  // WebRTC signaling — relay offer/answer/ICE between specific peers
  socket.on('voice_offer', ({ targetSocketId, offer, channelId }) => {
    io.to(targetSocketId).emit('voice_offer', {
      offer,
      fromSocketId: socket.id,
      fromUserId:   currentUser?.id,
      channelId,
    });
  });

  socket.on('voice_answer', ({ targetSocketId, answer, channelId }) => {
    io.to(targetSocketId).emit('voice_answer', {
      answer,
      fromSocketId: socket.id,
      channelId,
    });
  });

  socket.on('voice_ice', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('voice_ice', {
      candidate,
      fromSocketId: socket.id,
    });
  });

  // Mute/unmute broadcast
  socket.on('voice_mute', ({ channelId, muted }) => {
    if (!currentUser) return;
    socket.to(`voice_${channelId}`).emit('voice_peer_muted', {
      userId: currentUser.id,
      muted,
    });
  });

  function leaveVoice(channelId) {
    if (!channelId) return;
    const room = voiceRooms.get(channelId);
    if (room) {
      for (const peer of room) {
        if (peer.socketId === socket.id) { room.delete(peer); break; }
      }
      if (room.size === 0) voiceRooms.delete(channelId);
      else io.to(channelId).emit('voice_room_update', { channelId, peers: Array.from(room) });
    }
    socket.to(`voice_${channelId}`).emit('voice_peer_left', {
      socketId: socket.id,
      userId:   currentUser?.id,
    });
    socket.leave(`voice_${channelId}`);
    inVoiceChannel = null;
    console.log(`🔇 ${currentUser?.username} left voice in ${channelId}`);
  }

  socket.on('disconnect', () => {
    if (currentUser) {
      online.delete(currentUser.id);
      io.emit('online_update', Array.from(online.keys()));
      if (inVoiceChannel) leaveVoice(inVoiceChannel);
      console.log(`✗ ${currentUser.username} disconnected (${online.size} online)`);
    }
  });
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
initDb().then(() => {
  server.listen(PORT, () =>
    console.log(`\n⚛  NEXUS Chat server → http://localhost:${PORT}\n`));
}).catch(err => { console.error('Failed to start:', err); process.exit(1); });

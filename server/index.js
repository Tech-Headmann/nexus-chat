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
const io     = new Server(server, { cors: { origin:'*', methods:['GET','POST'] } });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // large for base64 images

const PORT    = process.env.PORT || 3001;
const DB_DIR  = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'nexus.db');

let db;

function saveDb() {
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); } catch(e) { console.error('DB save:', e.message); }
}
setInterval(saveDb, 10_000);
process.on('exit',    saveDb);
process.on('SIGINT',  () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

async function initDb() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🦋',
      color TEXT NOT NULL DEFAULT '#4f6ef7',
      avatar_img TEXT,
      display_name TEXT,
      bio TEXT,
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
  // Add new columns to existing DBs gracefully
  try { db.run('ALTER TABLE users ADD COLUMN avatar_img TEXT'); } catch {}
  try { db.run('ALTER TABLE users ADD COLUMN display_name TEXT'); } catch {}
  try { db.run('ALTER TABLE users ADD COLUMN bio TEXT'); } catch {}

  const seeds = [
    ['ch_general','general','🌐','Talk about anything'],
    ['ch_vibes',  'vibes',  '🎵','Music & good energy'],
    ['ch_tech',   'tech-talk','💻','Dev stuff & nerd talk'],
    ['ch_gaming', 'gaming', '🎮','Games & trash talk'],
    ['ch_random', 'random', '🎲','Chaos welcome'],
  ];
  for (const [id,name,icon,desc] of seeds)
    db.run('INSERT OR IGNORE INTO channels (id,name,icon,description,is_dm) VALUES (?,?,?,?,0)',[id,name,icon,desc]);
  saveDb();
  console.log('✓ Database ready');
}

function dbAll(sql, params=[]) {
  try {
    const stmt = db.prepare(sql); stmt.bind(params);
    const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); stmt.free(); return rows;
  } catch(e) { console.error('dbAll:', e.message); return []; }
}
const dbGet = (sql, p=[]) => dbAll(sql, p)[0] || null;
const dbRun = (sql, p=[]) => db.run(sql, p);

const PUBLIC_USER = 'id,username,avatar,avatar_img,color,display_name,bio,created_at';

const online     = new Map();
const voiceRooms = new Map();

/* ══════════════════════════════════════════════════
   REST
══════════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
  const { username, password, avatar, color } = req.body;
  if (!username?.trim() || !password)  return res.status(400).json({ error:'Missing fields' });
  if (username.trim().length < 2)      return res.status(400).json({ error:'Username must be 2+ characters' });
  if (password.length < 4)            return res.status(400).json({ error:'Password must be 4+ characters' });
  if (dbGet('SELECT id FROM users WHERE LOWER(username)=LOWER(?)',[username.trim()]))
    return res.status(409).json({ error:'Username already taken' });
  const hash = await bcrypt.hash(password, 10);
  const id   = uuid().replace(/-/g,'').slice(0,10);
  dbRun('INSERT INTO users (id,username,password_hash,avatar,color) VALUES (?,?,?,?,?)',
    [id, username.trim(), hash, avatar||'🦋', color||'#4f6ef7']);
  saveDb();
  res.json({ user: dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[id]) });
});

app.post('/api/login', async (req, res) => {
  const row = dbGet('SELECT * FROM users WHERE LOWER(username)=LOWER(?)',[req.body.username?.trim()||'']);
  if (!row || !await bcrypt.compare(req.body.password, row.password_hash))
    return res.status(401).json({ error:'Wrong username or password' });
  const { password_hash, ...user } = row;
  res.json({ user });
});

/* ── Account management ── */
app.post('/api/account/username', async (req, res) => {
  const { userId, newUsername, password } = req.body;
  if (!userId || !newUsername?.trim() || !password) return res.status(400).json({ error:'Missing fields' });
  if (newUsername.trim().length < 2) return res.status(400).json({ error:'Username must be 2+ characters' });
  const user = dbGet('SELECT * FROM users WHERE id=?',[userId]);
  if (!user) return res.status(404).json({ error:'User not found' });
  if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error:'Incorrect password' });
  if (dbGet('SELECT id FROM users WHERE LOWER(username)=LOWER(?) AND id!=?',[newUsername.trim(),userId]))
    return res.status(409).json({ error:'Username already taken' });
  dbRun('UPDATE users SET username=? WHERE id=?',[newUsername.trim(), userId]);
  saveDb();
  const updated = dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[userId]);
  io.emit('user_updated', updated);
  res.json({ user: updated });
});

app.post('/api/account/password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error:'Missing fields' });
  if (newPassword.length < 4) return res.status(400).json({ error:'New password must be 4+ characters' });
  const user = dbGet('SELECT * FROM users WHERE id=?',[userId]);
  if (!user) return res.status(404).json({ error:'User not found' });
  if (!await bcrypt.compare(currentPassword, user.password_hash)) return res.status(401).json({ error:'Incorrect current password' });
  dbRun('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(newPassword,10), userId]);
  saveDb();
  res.json({ ok:true });
});

app.post('/api/account/avatar', async (req, res) => {
  const { userId, imageDataUrl } = req.body;
  if (!userId || !imageDataUrl) return res.status(400).json({ error:'Missing fields' });
  // Validate it's a real image data URL
  if (!imageDataUrl.startsWith('data:image/')) return res.status(400).json({ error:'Invalid image format' });
  // Limit to ~3MB
  if (imageDataUrl.length > 4_000_000) return res.status(400).json({ error:'Image too large (max 3MB)' });
  dbRun('UPDATE users SET avatar_img=? WHERE id=?',[imageDataUrl, userId]);
  saveDb();
  const updated = dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[userId]);
  io.emit('user_updated', updated);
  res.json({ user: updated });
});

app.post('/api/account/displayname', async (req, res) => {
  const { userId, displayName } = req.body;
  if (!userId) return res.status(400).json({ error:'Missing userId' });
  const val = (displayName||'').trim().slice(0, 32) || null;
  dbRun('UPDATE users SET display_name=? WHERE id=?',[val, userId]);
  saveDb();
  const updated = dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[userId]);
  io.emit('user_updated', updated);
  res.json({ user: updated });
});

app.post('/api/account/bio', async (req, res) => {
  const { userId, bio } = req.body;
  if (!userId) return res.status(400).json({ error:'Missing userId' });
  const val = (bio||'').trim().slice(0, 190) || null;
  dbRun('UPDATE users SET bio=? WHERE id=?',[val, userId]);
  saveDb();
  const updated = dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[userId]);
  io.emit('user_updated', updated);
  res.json({ user: updated });
});

app.post('/api/account/delete', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ error:'Missing fields' });
  const user = dbGet('SELECT * FROM users WHERE id=?',[userId]);
  if (!user) return res.status(404).json({ error:'User not found' });
  if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error:'Incorrect password' });
  dbRun('DELETE FROM messages        WHERE author_id=?',[userId]);
  dbRun('DELETE FROM friends         WHERE user_id=? OR friend_id=?',[userId,userId]);
  dbRun('DELETE FROM friend_requests WHERE from_id=? OR to_id=?',[userId,userId]);
  dbRun('DELETE FROM channel_members WHERE user_id=?',[userId]);
  dbRun('DELETE FROM users           WHERE id=?',[userId]);
  saveDb();
  const sid = online.get(userId);
  if (sid) { io.to(sid).emit('account_deleted'); online.delete(userId); io.emit('online_update', Array.from(online.keys())); }
  console.log(`🗑 Account deleted: ${user.username}`);
  res.json({ ok:true });
});

/* ── Channels & messages ── */
app.get('/api/channels', (_, res) => res.json(dbAll('SELECT * FROM channels WHERE is_dm=0 ORDER BY created_at')));
app.get('/api/channels/:id/messages', (req, res) => res.json(dbAll(`
  SELECT m.id, m.channel_id, m.author_id, m.content, m.created_at,
         u.username, u.avatar, u.avatar_img, u.color, u.display_name
  FROM messages m JOIN users u ON u.id=m.author_id
  WHERE m.channel_id=? ORDER BY m.created_at ASC LIMIT 200
`,[req.params.id])));

/* ── Users ── */
app.get('/api/users/search', (req, res) =>
  res.json(dbAll(`SELECT ${PUBLIC_USER} FROM users WHERE username LIKE ? ORDER BY username LIMIT 30`,[`%${req.query.q||''}%`])));
app.get('/api/users', (_, res) => res.json(dbAll(`SELECT ${PUBLIC_USER} FROM users ORDER BY username`)));
app.get('/api/users/:id/friends',  (req, res) => res.json(dbAll(`SELECT u.id,u.username,u.avatar,u.avatar_img,u.color,u.display_name FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=?`,[req.params.id])));
app.get('/api/users/:id/requests', (req, res) => res.json(dbAll(`SELECT fr.id,fr.from_id,fr.to_id,fr.created_at,u.username,u.avatar,u.avatar_img,u.color FROM friend_requests fr JOIN users u ON u.id=fr.from_id WHERE fr.to_id=?`,[req.params.id])));

/* ── DMs ── */
app.post('/api/dm', (req, res) => {
  const { userA, userB } = req.body;
  const dmId = 'dm_' + [userA,userB].sort().join('_');
  if (!dbGet('SELECT id FROM channels WHERE id=?',[dmId])) {
    dbRun('INSERT INTO channels (id,name,icon,is_dm,created_by) VALUES (?,?,?,1,?)',[dmId,dmId,'💬',userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)',[dmId,userA]);
    dbRun('INSERT OR IGNORE INTO channel_members VALUES (?,?)',[dmId,userB]);
    saveDb();
  }
  res.json({
    channel:  dbGet('SELECT * FROM channels WHERE id=?',[dmId]),
    messages: dbAll(`SELECT m.id,m.channel_id,m.author_id,m.content,m.created_at,u.username,u.avatar,u.avatar_img,u.color,u.display_name FROM messages m JOIN users u ON u.id=m.author_id WHERE m.channel_id=? ORDER BY m.created_at ASC LIMIT 200`,[dmId]),
  });
});

app.get('/api/voice/:channelId', (req, res) => {
  const room = voiceRooms.get(req.params.channelId);
  res.json(room ? Array.from(room) : []);
});

/* ══════════════════════════════════════════════════
   SOCKETS
══════════════════════════════════════════════════ */
io.on('connection', (socket) => {
  let currentUser = null, currentRoom = null, inVoiceChannel = null;

  socket.on('auth', ({ userId }) => {
    currentUser = dbGet(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`,[userId]);
    if (!currentUser) return;
    online.set(userId, socket.id);
    io.emit('online_update', Array.from(online.keys()));
    console.log(`✓ ${currentUser.username} connected (${online.size} online)`);
  });

  socket.on('join_channel', ({ channelId }) => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = channelId; socket.join(channelId);
  });

  socket.on('send_message', ({ channelId, content }) => {
    if (!currentUser || !content?.trim()) return;
    const id = uuid().replace(/-/g,'').slice(0,12);
    const ts = Math.floor(Date.now()/1000);
    dbRun('INSERT INTO messages (id,channel_id,author_id,content,created_at) VALUES (?,?,?,?,?)',
      [id, channelId, currentUser.id, content.trim(), ts]);
    saveDb();
    io.to(channelId).emit('new_message', {
      id, channel_id:channelId, author_id:currentUser.id,
      content:content.trim(), created_at:ts,
      username:currentUser.username, avatar:currentUser.avatar,
      avatar_img:currentUser.avatar_img, color:currentUser.color,
      display_name:currentUser.display_name,
    });
  });

  socket.on('delete_channel', ({ channelId }) => {
    if (!currentUser) return;
    const chan = dbGet('SELECT * FROM channels WHERE id=?',[channelId]);
    if (!chan) return socket.emit('error','Channel not found');
    const defaults = ['ch_general','ch_vibes','ch_tech','ch_gaming','ch_random'];
    if (defaults.includes(channelId)) return socket.emit('error',"Default channels can't be deleted");
    if (chan.created_by && String(chan.created_by).trim() !== String(currentUser.id).trim())
      return socket.emit('error','Only the channel creator can delete it');
    dbRun('DELETE FROM messages WHERE channel_id=?',[channelId]);
    dbRun('DELETE FROM channel_members WHERE channel_id=?',[channelId]);
    dbRun('DELETE FROM channels WHERE id=?',[channelId]);
    saveDb();
    io.emit('channel_deleted', { channelId });
  });

  socket.on('create_channel', ({ name, icon, description }) => {
    if (!currentUser) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || 'channel';
    const id = 'ch_' + uuid().replace(/-/g,'').slice(0,8);
    const ts = Math.floor(Date.now()/1000);
    dbRun('INSERT INTO channels (id,name,icon,description,is_dm,created_by,created_at) VALUES (?,?,?,?,0,?,?)',
      [id, slug, icon||'✨', description||'', currentUser.id, ts]);
    saveDb();
    io.emit('channel_created', dbGet('SELECT * FROM channels WHERE id=?',[id]));
  });

  socket.on('typing', ({ channelId, isTyping }) => {
    if (!currentUser) return;
    socket.to(channelId).emit('user_typing', { userId:currentUser.id, username:currentUser.username, isTyping });
  });

  socket.on('send_friend_request', ({ toId }) => {
    if (!currentUser) return;
    if (dbGet('SELECT 1 FROM friends WHERE user_id=? AND friend_id=?',[currentUser.id,toId])) return socket.emit('error','Already friends!');
    if (dbGet('SELECT 1 FROM friend_requests WHERE from_id=? AND to_id=?',[currentUser.id,toId])) return socket.emit('error','Request already sent');
    const id = uuid().replace(/-/g,'').slice(0,10);
    const ts = Math.floor(Date.now()/1000);
    try { dbRun('INSERT INTO friend_requests (id,from_id,to_id,created_at) VALUES (?,?,?,?)',[id,currentUser.id,toId,ts]); saveDb(); }
    catch { return socket.emit('error','Could not send request'); }
    const req = { id, from_id:currentUser.id, to_id:toId, created_at:ts, username:currentUser.username, avatar:currentUser.avatar, avatar_img:currentUser.avatar_img, color:currentUser.color };
    const toSid = online.get(toId);
    if (toSid) io.to(toSid).emit('friend_request', req);
    socket.emit('request_sent', req);
  });

  socket.on('accept_request', ({ requestId, fromId }) => {
    if (!currentUser) return;
    dbRun('DELETE FROM friend_requests WHERE id=?',[requestId]);
    dbRun('INSERT OR IGNORE INTO friends VALUES (?,?)',[currentUser.id,fromId]);
    dbRun('INSERT OR IGNORE INTO friends VALUES (?,?)',[fromId,currentUser.id]);
    saveDb();
    socket.emit('friend_added', dbGet(`SELECT id,username,avatar,avatar_img,color,display_name FROM users WHERE id=?`,[fromId]));
    const fromSid = online.get(fromId);
    if (fromSid) io.to(fromSid).emit('friend_added', dbGet(`SELECT id,username,avatar,avatar_img,color,display_name FROM users WHERE id=?`,[currentUser.id]));
  });

  socket.on('decline_request', ({ requestId }) => {
    dbRun('DELETE FROM friend_requests WHERE id=?',[requestId]); saveDb();
    socket.emit('request_declined', { requestId });
  });

  /* Voice */
  socket.on('voice_join', ({ channelId }) => {
    if (!currentUser) return;
    if (!voiceRooms.has(channelId)) voiceRooms.set(channelId, new Set());
    const room = voiceRooms.get(channelId);
    socket.emit('voice_peers', Array.from(room));
    room.add({ userId:currentUser.id, socketId:socket.id, username:currentUser.username, avatar:currentUser.avatar, avatar_img:currentUser.avatar_img, color:currentUser.color });
    inVoiceChannel = channelId;
    socket.to(channelId).emit('voice_peer_joined', { userId:currentUser.id, socketId:socket.id, username:currentUser.username, avatar:currentUser.avatar, avatar_img:currentUser.avatar_img, color:currentUser.color });
    socket.join(`voice_${channelId}`);
    io.to(channelId).emit('voice_room_update', { channelId, peers: Array.from(room) });
  });

  socket.on('voice_leave',  ({ channelId }) => leaveVoice(channelId));
  socket.on('voice_offer',  ({ targetSocketId, offer,  channelId }) => io.to(targetSocketId).emit('voice_offer',  { offer,  fromSocketId:socket.id, channelId }));
  socket.on('voice_answer', ({ targetSocketId, answer, channelId }) => io.to(targetSocketId).emit('voice_answer', { answer, fromSocketId:socket.id, channelId }));
  socket.on('voice_ice',    ({ targetSocketId, candidate })         => io.to(targetSocketId).emit('voice_ice',    { candidate, fromSocketId:socket.id }));
  socket.on('voice_mute',   ({ channelId, muted }) => { if (currentUser) socket.to(`voice_${channelId}`).emit('voice_peer_muted', { userId:currentUser.id, muted }); });

  function leaveVoice(channelId) {
    if (!channelId) return;
    const room = voiceRooms.get(channelId);
    if (room) {
      for (const p of room) { if (p.socketId === socket.id) { room.delete(p); break; } }
      if (room.size === 0) voiceRooms.delete(channelId);
      else io.to(channelId).emit('voice_room_update', { channelId, peers: Array.from(room) });
    }
    socket.to(`voice_${channelId}`).emit('voice_peer_left', { socketId:socket.id, userId:currentUser?.id });
    socket.leave(`voice_${channelId}`);
    inVoiceChannel = null;
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

initDb().then(() => {
  server.listen(PORT, () => console.log(`\n⚛  NEXUS Chat → http://localhost:${PORT}\n`));
}).catch(err => { console.error('Fatal:', err); process.exit(1); });

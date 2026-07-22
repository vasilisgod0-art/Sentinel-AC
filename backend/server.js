const path = require('path');
const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const fs = require('fs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'sentinel-secret-key-change-in-production';

function hashPassword(password) {
  return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

function generateToken(user) {
  const payload = { id: user.id, username: user.username, exp: Date.now() + 86400000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function authMiddleware(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(auth.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

const app = express();
const port = process.env.PORT || 4000;

const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Cache index.html at startup
let indexHtml = '';
function loadIndexHtml() {
  try {
    const indexPath = path.resolve(__dirname, '..', 'frontend', 'index.html');
    indexHtml = fs.readFileSync(indexPath, 'utf-8');
    console.log('Loaded index.html from:', indexPath);
  } catch (err) {
    console.warn('Could not load index.html, will use fallback');
    indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentinel AC</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app"></div>
  <script src="/app.js"></script>
</body>
</html>`;
  }
}

async function initDb() {
  await db.read();
  db.data ||= {
    users: [],
    players: [],
    alerts: [],
    bans: [],
    actions: [],
    config: {
      enableBan: true,
      banDuration: 86400000,
      suspicionThreshold: 100,
      checkInterval: 5000,
      allowedWeapons: ['WEAPON_PISTOL', 'WEAPON_COMBATPISTOL', 'WEAPON_SMG']
    }
  };
  // Ensure all arrays exist on older db files
  db.data.users   ||= [];
  db.data.actions ||= [];
  // Seed default admin if no users exist
  if (db.data.users.length === 0) {
    db.data.users.push({ id: nanoid(), username: 'admin', password: hashPassword('Admin123!'), role: 'admin' });
    console.log('Seeded default admin user: admin / Admin123!');
  }
  await db.write();
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/status', async (req, res) => {
  await db.read();
  res.json({ status: 'ok', version: '1.0.0' });
});

app.get('/api/config', authMiddleware, async (req, res) => {
  await db.read();
  res.json(db.data.config);
});

app.post('/api/config', authMiddleware, async (req, res) => {
  await db.read();
  db.data.config = { ...db.data.config, ...req.body };
  await db.write();
  res.json(db.data.config);
});

app.get('/api/alerts', authMiddleware, async (req, res) => {
  await db.read();
  res.json(db.data.alerts.sort((a, b) => b.timestamp - a.timestamp));
});

app.get('/api/bans', authMiddleware, async (req, res) => {
  await db.read();
  res.json(db.data.bans);
});

app.post('/api/alerts', async (req, res) => {
  await db.read();
  const alert = {
    id: nanoid(),
    playerId: req.body.playerId,
    playerName: req.body.playerName,
    reason: req.body.reason,
    points: req.body.points,
    timestamp: Date.now(),
    handled: false
  };
  db.data.alerts.unshift(alert);
  await db.write();
  res.status(201).json(alert);
});

app.post('/api/ban', async (req, res) => {
  await db.read();
  const ban = {
    id: nanoid(),
    playerId: req.body.playerId,
    playerName: req.body.playerName,
    reason: req.body.reason,
    duration: req.body.duration || db.data.config.banDuration,
    timestamp: Date.now()
  };
  db.data.bans.unshift(ban);
  await db.write();
  res.status(201).json(ban);
});

app.post('/api/player', async (req, res) => {
  await db.read();
  const player = {
    id: req.body.id || nanoid(),
    name: req.body.name,
    lastSeen: Date.now(),
    suspicion: req.body.suspicion || 0,
    flags: req.body.flags || []
  };
  const found = db.data.players.find((item) => item.id === player.id);
  if (found) {
    Object.assign(found, player);
  } else {
    db.data.players.unshift(player);
  }
  await db.write();
  res.json(player);
});

app.get('/api/players', authMiddleware, async (req, res) => {
  await db.read();
  res.json(db.data.players);
});

app.get('/api/player/:id', async (req, res) => {
  await db.read();
  const player = db.data.players.find((item) => item.id === req.params.id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  res.json(player);
});

// ============ AUTH ============
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  await db.read();
  if (db.data.users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }
  const user = { id: nanoid(), username, password: hashPassword(password), role: 'admin' };
  db.data.users.push(user);
  await db.write();
  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  await db.read();
  const user = db.data.users.find(u => u.username === username && u.password === hashPassword(password));
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// ============ ACTIONS ============
app.get('/api/actions', authMiddleware, async (req, res) => {
  await db.read();
  res.json(db.data.actions || []);
});

// ============ MODERATION ============
app.post('/api/moderation/ban', authMiddleware, async (req, res) => {
  const { playerId, playerName, reason } = req.body;
  if (!playerId || !playerName) return res.status(400).json({ error: 'playerId and playerName required' });
  await db.read();
  const ban = { id: nanoid(), playerId, playerName, reason: reason || 'No reason given', timestamp: Date.now(), bannedBy: req.user.username };
  db.data.bans.unshift(ban);
  const player = db.data.players.find(p => p.id === playerId);
  if (player) player.status = 'banned';
  db.data.actions.unshift({ id: nanoid(), type: 'ban', playerId, playerName, reason: ban.reason, actor: req.user.username, timestamp: Date.now() });
  await db.write();
  res.status(201).json(ban);
});

app.post('/api/moderation/kick', authMiddleware, async (req, res) => {
  const { playerId, playerName, reason } = req.body;
  if (!playerId || !playerName) return res.status(400).json({ error: 'playerId and playerName required' });
  await db.read();
  const player = db.data.players.find(p => p.id === playerId);
  if (player && player.status !== 'banned') player.status = 'kicked';
  db.data.actions.unshift({ id: nanoid(), type: 'kick', playerId, playerName, reason: reason || 'No reason given', actor: req.user.username, timestamp: Date.now() });
  await db.write();
  res.json({ success: true });
});

app.post('/api/moderation/unban', authMiddleware, async (req, res) => {
  const { banId, playerId, playerName } = req.body;
  await db.read();
  if (banId) db.data.bans = db.data.bans.filter(b => b.id !== banId);
  const player = db.data.players.find(p => p.id === playerId);
  if (player) player.status = 'offline';
  db.data.actions.unshift({ id: nanoid(), type: 'unban', playerId, playerName: playerName || playerId, reason: 'Unbanned by admin', actor: req.user.username, timestamp: Date.now() });
  await db.write();
  res.json({ success: true });
});

app.get('/api/health', async (req, res) => {
  res.json({ status: 'healthy' });
});

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  res.type('text/html').send(indexHtml);
});

app.listen(port, async () => {
  try {
    loadIndexHtml();
    await initDb();
    console.log(`Sentinel backend running on port ${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
});

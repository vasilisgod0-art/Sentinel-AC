const path = require('path');
const express = require('express');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 4000;

const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= {
    players: [],
    alerts: [],
    bans: [],
    config: {
      enableBan: true,
      banDuration: 86400000,
      suspicionThreshold: 100,
      checkInterval: 5000,
      allowedWeapons: ['WEAPON_PISTOL', 'WEAPON_COMBATPISTOL', 'WEAPON_SMG']
    }
  };
  await db.write();
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/status', async (req, res) => {
  await db.read();
  res.json({ status: 'ok', version: '1.0.0' });
});

app.get('/api/config', async (req, res) => {
  await db.read();
  res.json(db.data.config);
});

app.post('/api/config', async (req, res) => {
  await db.read();
  db.data.config = { ...db.data.config, ...req.body };
  await db.write();
  res.json(db.data.config);
});

app.get('/api/alerts', async (req, res) => {
  await db.read();
  res.json(db.data.alerts.sort((a, b) => b.timestamp - a.timestamp));
});

app.get('/api/bans', async (req, res) => {
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

app.get('/api/players', async (req, res) => {
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

app.get('/api/health', async (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, async () => {
  await initDb();
  console.log(`Sentinel backend running on http://localhost:${port}`);
});

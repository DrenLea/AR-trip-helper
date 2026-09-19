const express = require('express');
const crypto = require('node:crypto');

const app = express();
const sessions = new Map();
const events = new Map();
const heartbeats = new Map();
const emergencies = new Map();
app.use(express.json());
const token = () => crypto.randomBytes(24).toString('hex');

app.post('/api/share-sessions', (req, res) => {
  const body = req.body || {};
  const role = body.role || 'caregiver';
  const ttlHours = Number(body.ttlHours || 24);
  if (typeof body.tripId !== 'string' || !['traveler', 'caregiver', 'companion'].includes(role) || !Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 168) {
    return res.status(400).json({ error: 'Invalid share session' });
  }
  const allowed = role === 'caregiver' ? ['itinerary', 'progress', 'coarse_location', 'precise_location'] : ['itinerary', 'progress'];
  const scopes = (Array.isArray(body.scopes) ? body.scopes : []).filter((scope) => allowed.includes(scope));
  const session = { token: token(), tripId: body.tripId, role, scopes, expiresAt: new Date(Date.now() + ttlHours * 3600000).toISOString() };
  sessions.set(session.token, session);
  return res.status(201).json({ token: session.token, session, url: `/share/${session.token}` });
});

app.get('/api/share-sessions/:token', (req, res) => {
  const session = sessions.get(req.params.token);
  if (!session || Date.parse(session.expiresAt) <= Date.now() || session.revokedAt) return res.status(410).json({ error: 'Share expired' });
  return res.json(session);
});

app.post('/api/trips/:tripId/events', (req, res) => {
  const allowed = ['arrived', 'skipped', 'delayed', 'rerouted', 'locked', 'unlocked'];
  if (!allowed.includes(req.body?.type)) return res.status(400).json({ error: 'Invalid event' });
  const list = events.get(req.params.tripId) || [];
  const event = { id: token(), tripId: req.params.tripId, version: list.length + 1, type: req.body.type, at: new Date().toISOString(), placeId: req.body.placeId, payload: req.body.payload };
  list.push(event); events.set(req.params.tripId, list);
  return res.status(201).json(event);
});

app.get('/api/trips/:tripId/events', (req, res) => {
  const after = Number(req.query.afterVersion || 0);
  return res.json({ events: (events.get(req.params.tripId) || []).filter((event) => event.version > after) });
});
app.post('/api/trips/:tripId/heartbeat', (req, res) => { const heartbeat = { ...req.body, tripId: req.params.tripId, at: new Date().toISOString() }; heartbeats.set(req.params.tripId, heartbeat); return res.status(201).json(heartbeat); });
app.get('/api/trips/:tripId/heartbeat/latest', (req, res) => { const heartbeat = heartbeats.get(req.params.tripId); return heartbeat ? res.json(heartbeat) : res.status(404).json({ error: 'No heartbeat' }); });
app.post('/api/trips/:tripId/emergency-events', (req, res) => { const list = emergencies.get(req.params.tripId) || []; const event = { id: token(), tripId: req.params.tripId, at: new Date().toISOString(), contactsNotified: req.body?.contactsNotified || [], callTarget: req.body?.callTarget, location: req.body?.location }; list.push(event); emergencies.set(req.params.tripId, list); return res.status(201).json(event); });

const port = Number(process.env.PORT || 8787);
app.listen(port, '127.0.0.1', () => console.log(`sync API listening on http://127.0.0.1:${port}`));

const express = require('express');
const crypto = require('node:crypto');

const app = express();
app.use(express.json());
app.use((req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); });
const sessions = new Map();
const events = new Map();
const heartbeats = new Map();
const emergencies = new Map();
const weatherCache = new Map();
const token = () => crypto.randomBytes(24).toString('hex');
const finite = (value) => value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
async function fetchJson(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(url, { ...options, signal: controller.signal }); if (!response.ok) throw new Error(`provider ${response.status}`); return await response.json(); }
  finally { clearTimeout(timer); }
}
require('./citySearch.cjs').registerCitySearch(app);
require('./guideContent.cjs').registerGuideContent(app);
app.get('/api/health', (req, res) => res.json({ app: 'trip-ar-helper', version: 'v2-guides', capabilities: ['global-city-search', 'wiki-content', 'weather'] }));

app.get('/api/weather', async (req, res) => {
  const lat = finite(req.query.lat); const lon = finite(req.query.lon); if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return res.status(400).json({ error: 'Invalid coordinates' });
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`; const cached = weatherCache.get(key); if (cached && cached.expiresAt > Date.now()) return res.json({ ...cached.value, source: 'cache', stale: false });
  try { const url = new URL('https://api.open-meteo.com/v1/forecast'); url.searchParams.set('latitude', String(lat)); url.searchParams.set('longitude', String(lon)); url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code'); url.searchParams.set('timezone', 'auto'); const payload = await fetchJson(url, {}, 5000); const current = payload.current || {}; const value = { temperature: current.temperature_2m, wind: current.wind_speed_10m, weatherCode: current.weather_code, retrievedAt: new Date().toISOString() }; weatherCache.set(key, { value, expiresAt: Date.now() + 10 * 60 * 1000 }); return res.json({ ...value, source: 'Open-Meteo', stale: false }); } catch { if (cached) return res.json({ ...cached.value, source: 'cache', stale: true }); return res.json({ source: 'Open-Meteo', unavailable: true, stale: true }); }
});

app.post('/api/share-sessions', (req, res) => { const body = req.body || {}; const role = body.role || 'caregiver'; const ttlHours = Number(body.ttlHours || 24); if (typeof body.tripId !== 'string' || !['traveler', 'caregiver', 'companion'].includes(role) || !Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 168) return res.status(400).json({ error: 'Invalid share session' }); const allowed = role === 'caregiver' ? ['itinerary', 'progress', 'coarse_location', 'precise_location'] : ['itinerary', 'progress']; const scopes = (Array.isArray(body.scopes) ? body.scopes : []).filter((scope) => allowed.includes(scope)); const session = { token: token(), tripId: body.tripId, role, scopes, expiresAt: new Date(Date.now() + ttlHours * 3600000).toISOString() }; sessions.set(session.token, session); return res.status(201).json({ token: session.token, session, url: `/share/${session.token}` }); });
app.get('/api/share-sessions/:token', (req, res) => { const session = sessions.get(req.params.token); if (!session || Date.parse(session.expiresAt) <= Date.now() || session.revokedAt) return res.status(410).json({ error: 'Share expired' }); return res.json(session); });
app.post('/api/trips/:tripId/events', (req, res) => { const allowed = ['arrived', 'skipped', 'delayed', 'rerouted', 'locked', 'unlocked']; if (!allowed.includes(req.body?.type)) return res.status(400).json({ error: 'Invalid event' }); const list = events.get(req.params.tripId) || []; const event = { id: token(), tripId: req.params.tripId, version: list.length + 1, type: req.body.type, at: new Date().toISOString(), placeId: req.body.placeId, payload: req.body.payload }; list.push(event); events.set(req.params.tripId, list); return res.status(201).json(event); });
app.get('/api/trips/:tripId/events', (req, res) => { const after = Number(req.query.afterVersion || 0); return res.json({ events: (events.get(req.params.tripId) || []).filter((event) => event.version > after) }); });
app.post('/api/trips/:tripId/heartbeat', (req, res) => { const heartbeat = { ...req.body, tripId: req.params.tripId, at: new Date().toISOString() }; heartbeats.set(req.params.tripId, heartbeat); return res.status(201).json(heartbeat); });
app.get('/api/trips/:tripId/heartbeat/latest', (req, res) => { const heartbeat = heartbeats.get(req.params.tripId); return heartbeat ? res.json(heartbeat) : res.status(404).json({ error: 'No heartbeat' }); });
app.post('/api/trips/:tripId/emergency-events', (req, res) => { const list = emergencies.get(req.params.tripId) || []; const event = { id: token(), tripId: req.params.tripId, at: new Date().toISOString(), contactsNotified: req.body?.contactsNotified || [], callTarget: req.body?.callTarget, location: req.body?.location }; list.push(event); emergencies.set(req.params.tripId, list); return res.status(201).json(event); });

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`sync API listening on http://${host}:${port}`));
server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.warn(`sync API port ${port} is already in use; reusing the existing instance`);
    return;
  }
  console.error('sync API failed to start', error);
  process.exitCode = 1;
});

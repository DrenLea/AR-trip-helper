const LOCAL = [
  { id: 'rome', name: '罗马', country: '意大利', countryCode: 'IT', lat: 41.9028, lon: 12.4964, status: 'installed', cityId: 'rome', landmark: 'colosseum', aliases: ['rome', 'roma', '罗马'] },
  { id: 'guiyang', name: '贵阳', country: '中国', countryCode: 'CN', lat: 26.647, lon: 106.63, status: 'installed', cityId: 'guiyang', landmark: 'jiaxiu', aliases: ['guiyang', '贵阳', '贵阳市'] },
];
const normalize = (value) => String(value || '').trim().toLowerCase();
const publicCity = ({ aliases, countryCode, ...city }) => city;
const localResults = (query) => LOCAL.filter((city) => !query || city.aliases.includes(normalize(query))).map(publicCity);
const coordinate = (value, bound) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= bound ? Number(value) : null;
function identifyCity(name, countryCode, lat, lon) {
  return LOCAL.find((city) => city.countryCode === String(countryCode).toUpperCase() && city.aliases.includes(normalize(name)) && Math.abs(city.lat - lat) < 0.25 && Math.abs(city.lon - lon) < 0.25);
}
function mapCity(item, source) {
  const meteo = source === 'open-meteo';
  const lat = coordinate(meteo ? item.latitude : item.lat, 90);
  const lon = coordinate(meteo ? item.longitude : item.lon, 180);
  if (lat === null || lon === null) return null;
  const name = meteo ? item.name : item.name || item.address?.city || item.address?.town || item.display_name?.split(',')[0];
  if (!name) return null;
  const code = meteo ? item.country_code : item.address?.country_code;
  const known = identifyCity(name, code, lat, lon);
  if (known) return { ...publicCity(known), source };
  const isParis = String(code).toUpperCase() === 'FR' && Math.abs(lat - 48.8566) < 0.15 && Math.abs(lon - 2.3522) < 0.15;
  return { id: meteo ? `geonames-${item.id}` : `osm-${item.osm_type}-${item.osm_id}`, name, country: meteo ? [item.admin1, item.country].filter(Boolean).join(' · ') : item.address?.country || '', lat, lon, status: 'online-only', landmark: isParis ? 'eiffel' : 'city', source };
}

function registerCitySearch(app, options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  const cache = new Map();
  const pending = new Map();
  const maxCache = 200;
  let active = 0;
  let nominatimBusy = false;
  let nextNominatimAt = 0;
  const timeoutMs = Math.max(100, Math.min(6000, Number(options.timeoutMs || process.env.CITY_SEARCH_TIMEOUT_MS) || 4500));
  async function fetchJson(url, headers = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { const response = await fetchImpl(url, { signal: controller.signal, headers }); if (!response.ok) throw new Error(`provider ${response.status}`); return await response.json(); }
    finally { clearTimeout(timer); }
  }
  async function lookup(query, submitted) {
    let meteoSucceeded = false;
    try {
      const url = new URL(options.openMeteoUrl || process.env.OPEN_METEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search');
      url.searchParams.set('name', query); url.searchParams.set('count', '12'); url.searchParams.set('language', 'zh'); url.searchParams.set('format', 'json');
      const data = await fetchJson(url);
      if (data.error || (data.results !== undefined && !Array.isArray(data.results))) throw new Error('invalid provider response');
      meteoSucceeded = true;
      const results = (data.results || []).map((item) => mapCity(item, 'open-meteo')).filter(Boolean);
      if (results.length || !submitted) return { results, source: 'open-meteo', attribution: 'Open-Meteo · GeoNames', unavailable: false };
    } catch { /* A manual search may fall back to OpenStreetMap. */ }
    if (submitted) {
      // Briefly wait for the shared gate without building an unbounded queue.
      const gateDeadline = Date.now() + 700;
      while (nominatimBusy && Date.now() < gateDeadline) await new Promise((resolve) => setTimeout(resolve, 25));
      if (nominatimBusy) return { results: [], source: 'open-meteo', attribution: 'Open-Meteo · GeoNames', unavailable: !meteoSucceeded, partial: meteoSucceeded };
      nominatimBusy = true;
      try {
        const delay = Math.max(0, nextNominatimAt - Date.now());
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        nextNominatimAt = Date.now() + 1100;
        const url = new URL(options.nominatimUrl || process.env.NOMINATIM_SEARCH_URL || 'https://nominatim.openstreetmap.org/search');
        for (const [key, value] of Object.entries({ q: query, format: 'jsonv2', addressdetails: '1', featuretype: 'city', limit: '12', 'accept-language': 'zh,en' })) url.searchParams.set(key, value);
        const data = await fetchJson(url, { Accept: 'application/json', 'User-Agent': process.env.GEOCODING_USER_AGENT || 'AR-Trip-Helper/0.1 (city search; manual submissions)' });
        if (!Array.isArray(data)) throw new Error('invalid provider response');
        return { results: data.map((item) => mapCity(item, 'nominatim')).filter(Boolean), source: 'nominatim', attribution: '© OpenStreetMap contributors · ODbL', unavailable: false };
      } catch { /* Return a distinguishable failure, not an invented empty search. */ }
      finally { nominatimBusy = false; }
    }
    return { results: [], source: 'open-meteo', attribution: 'Open-Meteo · GeoNames', unavailable: !meteoSucceeded, partial: meteoSucceeded };
  }
  app.get('/api/cities/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (query.length > 120) return res.status(400).json({ error: 'Search query is too long' });
    if (!query) return res.json({ results: localResults(''), source: 'installed', unavailable: false });
    const submitted = req.query.submitted === '1';
    const key = `${normalize(query)}:${submitted}`;
    const cached = cache.get(key);
    if (cached?.expiresAt > Date.now()) return res.json({ ...cached.value, cached: true });
    if (!pending.has(key)) {
      if (active >= 4) return res.status(503).json({ results: localResults(query), unavailable: true, error: 'Search is busy; retry shortly' });
      active += 1;
      const task = lookup(query, submitted).then((value) => {
        value.results = [...localResults(query), ...value.results].filter((city, index, all) => all.findIndex((other) => other.id === city.id) === index).slice(0, 12);
        if (cache.size >= maxCache) cache.delete(cache.keys().next().value);
        cache.set(key, { value, expiresAt: Date.now() + (value.unavailable ? 15000 : 600000) });
        return value;
      }).finally(() => { pending.delete(key); active -= 1; });
      pending.set(key, task);
    }
    const value = await pending.get(key);
    return res.status(value.unavailable ? 503 : 200).json(value);
  });
}
module.exports = { registerCitySearch, identifyCity, mapCity };

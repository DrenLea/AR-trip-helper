// @vitest-environment node
import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { registerCitySearch, mapCity } = require('../../../server/citySearch.cjs');
const response = (data: unknown) => ({ ok: true, json: async () => data });

describe('city search providers', () => {
  it('requires name, country and coordinates before assigning an installed package', () => {
    expect(mapCity({ id: 1, name: 'Rome', country_code: 'IT', latitude: 41.9, longitude: 12.49 }, 'open-meteo').cityId).toBe('rome');
    expect(mapCity({ id: 2, name: 'Rome', country_code: 'US', latitude: 34.25, longitude: -85.17 }, 'open-meteo').status).toBe('online-only');
    expect(mapCity({ id: 3, name: 'Rom', country_code: 'IT', latitude: 41.9, longitude: 12.49 }, 'open-meteo').cityId).toBeUndefined();
    expect(mapCity({ id: 4, name: 'Rome', country_code: 'IT', latitude: 0, longitude: 0 }, 'open-meteo').cityId).toBeUndefined();
  });
  it('returns global provider cities and preserves source through cache', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ results: [{ id: 3448439, name: 'São Paulo', country_code: 'BR', country: 'Brazil', latitude: -23.55, longitude: -46.63 }] }));
    const app = express(); registerCitySearch(app, { fetch });
    const first = await request(app).get('/api/cities/search?q=Sao%20Paulo&submitted=1');
    expect(first.status).toBe(200); expect(first.body.results[0]).toMatchObject({ name: 'São Paulo', status: 'online-only', source: 'open-meteo' });
    const cached = await request(app).get('/api/cities/search?q=Sao%20Paulo&submitted=1');
    expect(cached.body).toMatchObject({ cached: true, source: 'open-meteo' }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not call Nominatim without an explicit submission', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ results: [] }));
    const app = express(); registerCitySearch(app, { fetch });
    expect((await request(app).get('/api/cities/search?q=missing')).body.results).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await request(app).get('/api/cities/search?q=missing&submitted=1')).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[2][0])).toContain('nominatim.openstreetmap.org');
  });
  it('reports provider failure as unavailable, while retaining installed matches', async () => {
    const app = express(); registerCitySearch(app, { fetch: vi.fn().mockRejectedValue(new Error('offline')) });
    const result = await request(app).get('/api/cities/search?q=Rome&submitted=1');
    expect(result.status).toBe(503); expect(result.body.unavailable).toBe(true); expect(result.body.results[0].cityId).toBe('rome');
  });
  it('coalesces concurrent identical searches', async () => {
    let finish!: (value: unknown) => void;
    const fetch = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const app = express(); registerCitySearch(app, { fetch });
    const first = request(app).get('/api/cities/search?q=Tokyo').then((value) => value);
    const second = request(app).get('/api/cities/search?q=Tokyo').then((value) => value);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    finish(response({ results: [] }));
    await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

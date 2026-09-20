import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitySearchUnavailableError, localCityResults, searchCities } from './citySearch';
import { isMarkerVisible } from '../globe/InteractiveGlobe';

afterEach(() => vi.unstubAllGlobals());
describe('global city discovery', () => {
  it('offers only the two installed cities offline', async () => {
    expect(await searchCities(' ')).toEqual(localCityResults);
    expect(localCityResults.map((city) => city.cityId)).toEqual(['rome', 'guiyang']);
  });
  it('preserves a successful empty search instead of substituting sample cities', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }));
    expect(await searchCities('Atlantis')).toEqual([]);
    expect(fetch).toHaveBeenCalledWith('/api/cities/search?q=Atlantis&submitted=1', expect.anything());
  });
  it('distinguishes an unavailable search and retains real local results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ unavailable: true, results: [localCityResults[0]] }) }));
    await expect(searchCities('Rome')).rejects.toMatchObject({ name: 'CitySearchUnavailableError', localResults: [localCityResults[0]] });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(searchCities('Paris')).rejects.toBeInstanceOf(CitySearchUnavailableError);
  });
  it('hides the far side of the globe', () => {
    expect(isMarkerVisible({ lat: 0, lon: 0 }, [0, 0])).toBe(true);
    expect(isMarkerVisible({ lat: 0, lon: 180 }, [0, 0])).toBe(false);
    expect(isMarkerVisible({ lat: 26.647, lon: 106.63 }, [106.63, 26.647])).toBe(true);
  });
});

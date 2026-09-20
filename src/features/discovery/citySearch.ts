export type CityPackStatus = 'installed' | 'downloadable' | 'generatable' | 'online-only';
export type Landmark = 'colosseum' | 'jiaxiu' | 'eiffel' | 'city';
export const cityPackStatusLabel: Record<CityPackStatus, string> = { installed: '已加载数据包', downloadable: '可下载数据包', generatable: '可生成基础包', 'online-only': '在线探索，尚未加载数据包' };
export interface CitySearchResult { id: string; name: string; country: string; lat: number; lon: number; status: CityPackStatus; cityId?: 'rome' | 'guiyang'; landmark?: Landmark; source?: string }

export const localCityResults: CitySearchResult[] = [
  { id: 'rome', name: '罗马', country: '意大利', lat: 41.9028, lon: 12.4964, status: 'installed', cityId: 'rome', landmark: 'colosseum' },
  { id: 'guiyang', name: '贵阳', country: '中国', lat: 26.647, lon: 106.63, status: 'installed', cityId: 'guiyang', landmark: 'jiaxiu' },
];

export class CitySearchUnavailableError extends Error {
  constructor(public readonly localResults: CitySearchResult[] = []) { super('全球城市搜索暂时不可用，请稍后重试。'); this.name = 'CitySearchUnavailableError'; }
}

/** Invoke on explicit form submission, never on each keystroke (Nominatim policy). */
export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [...localCityResults];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(`/api/cities/search?q=${encodeURIComponent(trimmed)}&submitted=1`, { signal: controller.signal });
    const data = await response.json() as { results?: CitySearchResult[]; unavailable?: boolean };
    if (!response.ok || data.unavailable || !Array.isArray(data.results)) throw new CitySearchUnavailableError(data.results ?? []);
    return data.results;
  } catch (error) {
    if (error instanceof CitySearchUnavailableError) throw error;
    throw new CitySearchUnavailableError();
  } finally { clearTimeout(timer); }
}

export type CityId = 'rome' | 'guiyang' | (string & {});
export type PlaceCategory = 'sight' | 'meal' | 'rest' | 'hotel' | 'museum' | 'park' | 'other';
export type AccessibilityStatus = 'yes' | 'no' | 'unknown';
export type TransitMode = 'walk' | 'transit' | 'taxi' | 'other';
export type ExplanationSeverity = 'positive' | 'info' | 'warning' | 'error';
export type LocationPrecision = 'none' | 'coarse' | 'precise';

export interface SourceRef { source: string; url: string; license: string; retrievedAt: string }
export interface PlaceAccess { stepFree?: AccessibilityStatus; slopeRisk?: 'low' | 'medium' | 'high' | 'unknown'; restroom?: AccessibilityStatus }
export interface OpeningHours { dayOfWeek?: number[]; opens: string; closes: string }
export interface Place {
  id: string; cityId: CityId; name: string; category: PlaceCategory; lat: number; lon: number;
  interestTags: string[]; access?: PlaceAccess; sourceRefs: SourceRef[]; openingHours?: OpeningHours[];
  rating?: number; ratingCount?: number; durationMin?: number; address?: string;
}
export interface HeritageAsset { id: string; placeId: string; type: 'glb' | 'image' | 'audio' | 'link'; url: string; license: string; attribution: string; sourceUrl: string; redistributable: boolean; checkedAt: string }
export interface Leg { mode: TransitMode; from: string; to: string; distanceM?: number; durationMin: number; transfers?: number; routeRef?: string; riskFlags: string[]; dataFreshAt?: string; walkingDistanceM?: number }
export interface Stop { placeId: string; kind: PlaceCategory; arrival?: string; departure?: string; durationMin?: number; locked?: boolean }
export interface Explanation { code: string; severity: ExplanationSeverity; placeId?: string; message: string; sourceRefs?: SourceRef[] }
export interface Itinerary { cityId: CityId; date: string; stops: Stop[]; legs: Leg[]; totals: { steps: number; walkM: number; transitMin: number; transfers: number; backtrackM: number; restMin?: number; visitMin?: number; durationMin?: number }; effort?: { level: 'light' | 'moderate' | 'high'; label: string; estimatedMinutes: number }; explanations: Explanation[]; freshness: { sources: SourceRef[] } }
export interface MealWindow { type: 'breakfast' | 'lunch' | 'dinner'; start: string; end: string }
export interface PlanningConstraints { maxDailySteps: number; maxSingleWalkM: number; restEveryMin: number; mealWindows: MealWindow[]; wheelchairMode?: boolean; dayStart?: string; dayEnd?: string; minVisitCount?: number; maxVisitCount?: number; restDurationMin?: number }
export interface TransitRouteConfig { routeRef: string; routeName: string; fromStop: string; toStop: string; source: string; freshAt: string; departure?: string; arrival?: string; transfers?: number }
export interface CityPack { id: CityId; name: string; places: Place[]; heritageAssets: HeritageAsset[]; rules: { walkingEffortMultiplier: number; slopeRiskMultiplier: number; defaultTransitLabel: string; themeTags: string[]; emergencyTargets: string[]; transitRoutes?: TransitRouteConfig[] } }
export interface ShareSession { token: string; tripId: string; role: 'caregiver' | 'companion'; scopes: string[]; expiresAt: string }
export interface TripEvent { version: number; type: string; tripId: string; createdAt: string; placeId?: string; payload?: Record<string, unknown> }
export interface ProgressHeartbeat { tripId: string; status: 'on_track' | 'delayed' | 'paused' | 'complete'; updatedAt: string; locationPrecision: LocationPrecision; lat?: number; lon?: number; battery?: number }
export interface EmergencyEvent { tripId: string; createdAt: string; locationPrecision: LocationPrecision; selectedTarget?: string; notificationStatus?: string; cancelledAt?: string }

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object') throw new Error('Expected object'); return value as Record<string, unknown> }
export function assertPlace(value: unknown): Place {
  const v = object(value); const required = ['id','cityId','name','category','lat','lon','interestTags','sourceRefs'];
  for (const key of required) if (!(key in v)) throw new Error(`Place requires ${key}`);
  if (typeof v.id !== 'string' || typeof v.cityId !== 'string' || typeof v.name !== 'string') throw new Error('Place identity fields must be strings');
  if (typeof v.lat !== 'number' || typeof v.lon !== 'number' || !Number.isFinite(v.lat) || !Number.isFinite(v.lon) || v.lat < -90 || v.lat > 90 || v.lon < -180 || v.lon > 180 || !Array.isArray(v.interestTags) || !Array.isArray(v.sourceRefs) || v.sourceRefs.length === 0) throw new Error('Place coordinates, interestTags, and non-empty sourceRefs are invalid');
  if (!['sight','meal','rest','hotel','museum','park','other'].includes(String(v.category))) throw new Error('Invalid place category');
  for (const ref of v.sourceRefs) { const r=object(ref); if(typeof r.source!=='string'||typeof r.url!=='string'||typeof r.license!=='string'||typeof r.retrievedAt!=='string') throw new Error('sourceRefs require source, url, license, retrievedAt'); }
  if (v.access && typeof v.access==='object' && 'stepFree' in v.access && !['yes','no','unknown'].includes(String((v.access as Record<string,unknown>).stepFree))) throw new Error('Invalid accessibility status');
  return v as unknown as Place;
}
export function assertCityPack(value: unknown): CityPack {
  const v = object(value); for (const key of ['id','name','places','heritageAssets','rules']) if (!(key in v)) throw new Error(`CityPack requires ${key}`);
  if (!Array.isArray(v.places)) throw new Error('CityPack places must be an array'); v.places.forEach(assertPlace);
  if (!Array.isArray(v.heritageAssets) || !v.rules || typeof v.rules!=='object') throw new Error('CityPack assets and rules are invalid');
  for (const a of v.heritageAssets) { const x=object(a); for (const k of ['id','placeId','type','url','license','attribution','sourceUrl','checkedAt']) if(typeof x[k]!=='string') throw new Error(`HeritageAsset requires ${k}`); if(typeof x.redistributable!=='boolean') throw new Error('HeritageAsset redistributable is invalid'); }
  return v as unknown as CityPack;
}


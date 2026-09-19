import { guiyangPack } from './guiyang';
import { romePack } from './rome';
import type { CityId, CityPack } from '../domain/models';
const cityPacks: readonly CityPack[] = [romePack, guiyangPack];
export interface CityPackSummary { id: CityId; name: string; themeTags: string[] }
export function getCityPack(cityId: CityId): CityPack { const pack = cityPacks.find((item) => item.id === cityId); if (!pack) throw new Error(`Unsupported city: ${cityId}`); return pack; }
export function listCityPacks(): CityPackSummary[] { return cityPacks.map(({id,name,rules}) => ({id,name,themeTags:[...rules.themeTags]})); }

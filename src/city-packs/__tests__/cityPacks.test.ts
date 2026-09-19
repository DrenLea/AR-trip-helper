import { describe, expect, it } from 'vitest';
import { getCityPack, listCityPacks } from '../registry';
describe('city packs', () => { it('registers demo cities',()=>expect(listCityPacks().map(c=>c.id)).toEqual(['rome','guiyang'])); it('has emergency targets',()=>{expect(getCityPack('rome').rules.emergencyTargets).toEqual(['112']); expect(getCityPack('guiyang').rules.emergencyTargets).toEqual(['110','120','119']);}); });

import places from '../data/guiyang.places.json';
import { assertCityPack, type CityPack } from '../domain/models';
export const guiyangPack: CityPack = assertCityPack({ id:'guiyang', name:'Guiyang', places, heritageAssets:[], rules:{ walkingEffortMultiplier:1.25, slopeRiskMultiplier:1.4, defaultTransitLabel:'Guiyang transit sample', themeTags:['step-free','low-slope','rest-friendly'], emergencyTargets:['110','120','119'] } });

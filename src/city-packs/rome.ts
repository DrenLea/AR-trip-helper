import places from '../data/rome.places.json';
import assets from '../data/heritage-assets.json';
import { assertCityPack, type CityPack } from '../domain/models';
export const romePack: CityPack = assertCityPack({ id:'rome', name:'Rome', places, heritageAssets:assets, rules:{ walkingEffortMultiplier:1, slopeRiskMultiplier:1, defaultTransitLabel:'ATAC/GTFS sample', themeTags:['ancient-rome','archaeology','renaissance'], emergencyTargets:['112'] } });

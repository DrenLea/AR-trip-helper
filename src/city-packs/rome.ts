import places from '../data/rome.places.json';
import assets from '../data/heritage-assets.json';
import { assertCityPack, type CityPack } from '../domain/models';
export const romePack: CityPack = assertCityPack({ id:'rome', name:'Rome', places, heritageAssets:assets, rules:{ walkingEffortMultiplier:1, slopeRiskMultiplier:1, defaultTransitLabel:'ATAC/GTFS sample', themeTags:['ancient-rome','archaeology','renaissance'], emergencyTargets:['112'], transitRoutes:[{routeRef:'rome-bus-87',routeName:'Bus 87',fromStop:'Colosseo',toStop:'Argentina',source:'ATAC GTFS sample',freshAt:'2026-09-19',departure:'10:00',arrival:'10:24',transfers:1}] } });

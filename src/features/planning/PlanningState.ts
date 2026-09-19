import type { CityId, Itinerary, PlanningConstraints } from '../../domain/models';
export interface PlanningState { cityId:CityId; constraints:PlanningConstraints; itinerary:Itinerary|null; selectedStopId?:string; lockedStopIds:string[] }

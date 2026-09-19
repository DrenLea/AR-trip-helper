import type { Itinerary } from '../domain/models';
export interface OfflineEvent { type:string; placeId?:string; [key:string]:unknown }
export function createMemoryOfflineStore(){let itinerary:Itinerary|null=null; const events:OfflineEvent[]=[]; return {async saveLastItinerary(value:Itinerary){itinerary=value;},async loadLastItinerary(){return itinerary;},async queueOfflineTripEvent(event:OfflineEvent){const {lat,lon,...safe}=event; void lat;void lon;events.push(safe);},async listQueuedTripEvents(){return [...events];},async clearQueuedTripEvents(){events.length=0;}};}
export const saveLastItinerary=async(_i:Itinerary)=>{}; export const loadLastItinerary=async()=>null; export const queueOfflineTripEvent=async(_e:OfflineEvent)=>{};

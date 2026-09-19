import { nanoid } from 'nanoid';
import type { EmergencyEvent, ProgressHeartbeat, ShareSession, TripEvent, TripEventType } from './types';
export interface MemoryStore { sessions: Map<string, ShareSession>; events: Map<string, TripEvent[]>; heartbeats: Map<string, ProgressHeartbeat>; emergencies: Map<string, EmergencyEvent[]> }
export function createMemoryStore(): MemoryStore { return { sessions:new Map(), events:new Map(), heartbeats:new Map(), emergencies:new Map() }; }
export function addEvent(store: MemoryStore, tripId: string, type: TripEventType, placeId?: string, payload?: Record<string,unknown>): TripEvent { const list=store.events.get(tripId)??[]; const event={id:nanoid(),tripId,version:list.length+1,type,at:new Date().toISOString(),placeId,payload}; list.push(event); store.events.set(tripId,list); return event; }

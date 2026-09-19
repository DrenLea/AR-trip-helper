export type ShareRole = 'traveler' | 'caregiver' | 'companion';
export type ShareScope = 'itinerary' | 'progress' | 'coarse_location' | 'precise_location';
export type TripEventType = 'arrived' | 'skipped' | 'delayed' | 'rerouted' | 'locked' | 'unlocked';
export interface ShareSession { token: string; tripId: string; role: ShareRole; scopes: ShareScope[]; expiresAt: string; revokedAt?: string }
export interface TripEvent { id: string; tripId: string; version: number; type: TripEventType; at: string; placeId?: string; payload?: Record<string, unknown> }
export interface ProgressHeartbeat { tripId: string; at: string; status: 'moving'|'at_stop'|'resting'|'delayed'|'sos'; placeId?: string; lat?: number; lon?: number; precision: 'exact'|'coarse'; steps?: number; battery?: number }
export interface EmergencyEvent { id: string; tripId: string; at: string; location?: {lat:number;lon:number;precision:'exact'|'coarse'}; contactsNotified: string[]; callTarget?: string; cancelledAt?: string }

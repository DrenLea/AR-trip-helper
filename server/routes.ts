import express from 'express';
import { nanoid } from 'nanoid';
import type { MemoryStore } from './store';
import { addEvent } from './store';
import type { ShareRole, ShareScope, TripEventType } from './types';
export function createApp(store: MemoryStore) { const app=express(); app.use(express.json());
  app.post('/api/share-sessions',(req,res)=>{const {tripId,role='caregiver',scopes=['itinerary','progress','coarse_location'],ttlHours=24}=req.body??{}; if(typeof tripId!=='string'||!['traveler','caregiver','companion'].includes(role)||!Number.isFinite(ttlHours)||ttlHours<1||ttlHours>168)return res.status(400).json({error:'Invalid share session'}); const allowed:ShareScope[]=role==='caregiver'?['itinerary','progress','coarse_location','precise_location']:['itinerary','progress']; const clean=(Array.isArray(scopes)?scopes:[]).filter((s):s is ShareScope=>allowed.includes(s)); const token=nanoid(24)+nanoid(8); const session={token,tripId,role:role as ShareRole,scopes:clean,expiresAt:new Date(Date.now()+ttlHours*3600000).toISOString()}; store.sessions.set(token,session); return res.status(201).json({token,session,url:`/share/${token}`});});
  app.get('/api/share-sessions/:token',(req,res)=>{const s=store.sessions.get(req.params.token); if(!s||s.revokedAt||Date.parse(s.expiresAt)<=Date.now())return res.status(410).json({error:'Share expired'}); res.json(s);});
  app.post('/api/trips/:tripId/events',(req,res)=>{const {type,placeId,payload}=req.body??{}; if(!['arrived','skipped','delayed','rerouted','locked','unlocked'].includes(type))return res.status(400).json({error:'Invalid event'}); res.status(201).json(addEvent(store,req.params.tripId,type as TripEventType,placeId,payload));});
  app.get('/api/trips/:tripId/events',(req,res)=>{const after=Number(req.query.afterVersion??0); res.json({events:(store.events.get(req.params.tripId)??[]).filter(e=>e.version>after)});});
  app.post('/api/trips/:tripId/heartbeat',(req,res)=>{const h={...req.body,tripId:req.params.tripId,at:new Date().toISOString()}; store.heartbeats.set(req.params.tripId,h); res.status(201).json(h);});
  app.get('/api/trips/:tripId/heartbeat/latest',(req,res)=>{const h=store.heartbeats.get(req.params.tripId); if(!h)return res.status(404).json({error:'No heartbeat'}); res.json(h);});
  app.post('/api/trips/:tripId/emergency-events',(req,res)=>{const list=store.emergencies.get(req.params.tripId)??[]; const e={id:nanoid(),tripId:req.params.tripId,at:new Date().toISOString(),contactsNotified:req.body?.contactsNotified??[],callTarget:req.body?.callTarget,location:req.body?.location}; list.push(e); store.emergencies.set(req.params.tripId,list); res.status(201).json(e);});
  return app;
}

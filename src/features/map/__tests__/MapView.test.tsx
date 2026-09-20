import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MapView, { routeMapPoints } from '../MapView';
const itinerary = {cityId:'rome',date:'2026-01-01',stops:[{placeId:'a',kind:'sight'}],legs:[],totals:{steps:0,walkM:0,transitMin:0,transfers:0,backtrackM:0},explanations:[],freshness:{sources:[]}} as any;
describe('MapView',()=>it('renders route map affordance',()=>{render(<MapView itinerary={itinerary}/>); expect(screen.getByRole('region',{name:'Route map'})).toBeTruthy();}));

it('uses city-pack coordinates, includes endpoints, and deduplicates rest locations',()=>{
  const points=routeMapPoints({...itinerary,cityId:'guiyang',stops:[{placeId:'guiyang-jiaxiu',kind:'sight'},{placeId:'guiyang-jiaxiu',kind:'rest'}],legs:[{from:'guiyang-hotel',to:'guiyang-jiaxiu'},{from:'guiyang-jiaxiu',to:'guiyang-hotel'}]});
  expect(points.map(p=>p.id)).toEqual(['guiyang-hotel','guiyang-jiaxiu']);
  expect(points[1].lat).toBe(26.569);
  expect(points[1].lon).toBe(106.716);
});

it('does not invent positions for unknown cities or places',()=>{
  expect(routeMapPoints(itinerary)).toEqual([]);
  expect(routeMapPoints({...itinerary,cityId:'unknown'})).toEqual([]);
});

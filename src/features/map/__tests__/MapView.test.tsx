import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MapView from '../MapView';
const itinerary = {cityId:'rome',date:'2026-01-01',stops:[{placeId:'a',kind:'sight'}],legs:[],totals:{steps:0,walkM:0,transitMin:0,transfers:0,backtrackM:0},explanations:[],freshness:{sources:[]}} as any;
describe('MapView',()=>it('renders route map affordance',()=>{render(<MapView itinerary={itinerary}/>); expect(screen.getByRole('region',{name:'Route map'})).toBeTruthy();}));

import transitData from '../../data/demo-transit.json';
import type { CityPack, Itinerary, Leg, Place, PlanningConstraints, Stop } from '../models';
import { distanceM, filterCandidates } from './constraints';
import { scorePlace } from './score';

export interface PlanDayInput { cityPack: CityPack; date: string; startPlaceId: string; endPlaceId: string; interests: Record<string, number>; constraints: PlanningConstraints }
export interface TransitLegDisplay { routeName: string; fromStop: string; toStop: string; departure: string; arrival: string; source: string; freshAt: string; transfers?: number }
export function summarizeTransitLeg(leg: Leg): TransitLegDisplay {
  const row = transitData.find(x => x.routeRef === leg.routeRef);
  return { routeName: row ? row.routeName + '（样例，待核实）' : '接驳方式待确认', fromStop: row?.fromStop ?? leg.from, toStop: row?.toStop ?? leg.to, departure: '待查询', arrival: '待查询', source: row?.source ?? '距离估算，非实时班次', freshAt: leg.dataFreshAt ?? row?.freshAt ?? 'unknown', transfers: leg.transfers };
}
const isVisit = (p: Place) => !['hotel', 'meal', 'rest'].includes(p.category);
const durationFor = (p: Place) => p.durationMin ?? (p.category === 'meal' ? 60 : p.category === 'rest' ? 20 : 40);
const minutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
const clock = (value: number) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');

function makeItinerary(input: PlanDayInput, sequence: Place[]): Itinerary {
  const { cityPack, constraints } = input;
  const start = cityPack.places.find(p => p.id === input.startPlaceId) ?? cityPack.places[0];
  const end = cityPack.places.find(p => p.id === input.endPlaceId) ?? start;
  const stops: Stop[] = [], legs: Leg[] = [];
  const dayStart = minutes(constraints.dayStart ?? '09:00');
  let time = dayStart, active = 0, walkM = 0, transitMin = 0, restMin = 0, visitMin = 0, prev = start;
  const breakDuration = constraints.restDurationMin ?? 20;
  const addRest = (at: Place, duration = breakDuration) => {
    if (duration <= 0) return;
    stops.push({ placeId: at.id, kind: 'rest', arrival: clock(time), departure: clock(time + duration), durationMin: duration });
    time += duration; restMin += duration; active = 0;
  };
  const moveTo = (place: Place) => {
    if (place.id === prev.id) return;
    // Coordinates give a straight-line estimate; allow for street detours and terrain.
    const distance = Math.round(distanceM(prev.lat, prev.lon, place.lat, place.lon) * 1.2 * cityPack.rules.walkingEffortMultiplier);
    const walking = distance <= constraints.maxSingleWalkM;
    const accessM = walking ? distance : Math.round(Math.min(200, constraints.maxSingleWalkM * 2));
    const duration = walking ? Math.max(1, Math.ceil(distance / 65)) : Math.ceil(distance / 300) + 12 + Math.ceil(accessM / 65);
    if (constraints.restEveryMin > 0 && active > 0 && active + duration > constraints.restEveryMin) addRest(prev);
    legs.push({ mode: walking ? 'walk' : 'other', from: prev.id, to: place.id, distanceM: distance, walkingDistanceM: accessM, durationMin: duration, riskFlags: walking ? ['distance-estimate'] : ['connection-unverified', 'access-walk-estimate'] });
    walkM += accessM;
    if (!walking) transitMin += duration;
    time += duration; active += duration; prev = place;
  };
  for (const place of sequence) {
    moveTo(place);
    if (place.category === 'meal') {
      const window = constraints.mealWindows[0];
      if (window && time < minutes(window.start)) addRest(place, minutes(window.start) - time);
    }
    const duration = durationFor(place);
    if (isVisit(place) && constraints.restEveryMin > 0 && active > 0 && active + duration > constraints.restEveryMin) addRest(place);
    stops.push({ placeId: place.id, kind: place.category, arrival: clock(time), departure: clock(time + duration), durationMin: duration });
    time += duration;
    if (isVisit(place)) {
      visitMin += duration; active += duration;
      // Includes estimated walking within sights and parks, even when transfers are motorized.
      walkM += duration * (place.category === 'park' ? 15 : 9) * cityPack.rules.walkingEffortMultiplier;
      if (constraints.restEveryMin > 0 && active >= constraints.restEveryMin) addRest(place);
    } else { active = 0; if (place.category === 'rest') restMin += duration; }
  }
  moveTo(end);
  const steps = Math.ceil(walkM / .72), durationMin = time - dayStart;
  const level = steps < 3000 && visitMin < 100 ? 'light' : steps < 6500 && visitMin < 150 ? 'moderate' : 'high';
  return {
    cityId: cityPack.id, date: input.date, stops, legs,
    totals: { steps, walkM: Math.round(walkM), transitMin, transfers: 0, backtrackM: 0, restMin, visitMin, durationMin },
    effort: { level, label: level === 'light' ? '轻松强度（估算）' : level === 'moderate' ? '适中强度（估算）' : '较高强度（估算）', estimatedMinutes: durationMin },
    explanations: [{ code: 'effort-estimate', severity: 'info', message: '步数含景点内步行和接驳步行；距离、用时与强度均为估算，未接入实际道路、实时公交或个人体能数据。' }],
    freshness: { sources: sequence.flatMap(p => p.sourceRefs) }
  };
}
function withMeal(input: PlanDayInput, visits: Place[]): Place[] {
  const sequence = [...visits];
  const meal = input.cityPack.places.find(p => p.category === 'meal' && (!input.constraints.wheelchairMode || p.access?.stepFree !== 'no'));
  if (meal && input.constraints.mealWindows.length && visits.length) sequence.splice(Math.min(2, sequence.length), 0, meal);
  return sequence;
}
function withinBudget(input: PlanDayInput, plan: Itinerary) {
  return plan.totals.steps <= input.constraints.maxDailySteps &&
    (plan.totals.durationMin ?? 0) <= minutes(input.constraints.dayEnd ?? '18:00') - minutes(input.constraints.dayStart ?? '09:00');
}
export function planDay(input: PlanDayInput): Itinerary {
  const { cityPack, constraints } = input;
  const start = cityPack.places.find(p => p.id === input.startPlaceId) ?? cityPack.places[0];
  const filtered = filterCandidates({ candidates: cityPack.places.filter(isVisit), cityPack, constraints, from: start });
  const ranked = filtered.included.sort((a, b) => scorePlace(b, { interests: input.interests, cityPack, constraints }).total - scorePlace(a, { interests: input.interests, cityPack, constraints }).total);
  const chosen: Place[] = [];
  const maxVisits = constraints.maxVisitCount ?? (constraints.maxDailySteps <= 4500 ? 1 : constraints.maxDailySteps <= 7500 ? 2 : 3);
  for (const place of ranked) {
    if (chosen.length >= maxVisits) break;
    if (withinBudget(input, makeItinerary(input, withMeal(input, [...chosen, place])))) chosen.push(place);
  }
  const result = makeItinerary(input, withMeal(input, chosen));
  result.explanations.push(...filtered.excluded.flatMap(x => x.explanations));
  for (const place of chosen) if (!place.access?.stepFree || place.access.stepFree === 'unknown') result.explanations.push({ code: 'unknown-access', severity: 'warning', placeId: place.id, message: '无障碍状态未知，请现场确认', sourceRefs: place.sourceRefs });
  if (result.legs.some(l => l.mode === 'other')) result.explanations.push({ code: 'connection-unverified', severity: 'warning', message: '较长路段按车辆接驳估算，公交线路、班次和候车时间尚未核实，出发前需确认交通方式。' });
  if (!chosen.length) result.explanations.push({ code: 'no-feasible-visits', severity: 'warning', message: '当前步数或时间预算不足以安排景点，请调整预算或起终点。' });
  if (!withinBudget(input, result)) result.explanations.push({ code: 'over-budget', severity: 'error', message: '起终点之间的估算已超出当前预算。' });
  return result;
}
export interface ReplaceStopInput extends PlanDayInput { itinerary: Itinerary; lockedPlaceIds: string[]; replacementPlaceId: string }
export function replaceStop(input: ReplaceStopInput): Itinerary {
  const replacement = input.cityPack.places.find(p => p.id === input.replacementPlaceId);
  if (!replacement) throw new Error('Unknown replacement: ' + input.replacementPlaceId);
  const visitStops = input.itinerary.stops.filter(s => !['rest', 'meal'].includes(s.kind));
  const target = visitStops.findIndex(s => !input.lockedPlaceIds.includes(s.placeId));
  if (target < 0) return input.itinerary;
  const ids = visitStops.map(s => s.placeId); ids[target] = replacement.id;
  const places = ids.map(id => input.cityPack.places.find(p => p.id === id)).filter((p): p is Place => !!p);
  const result = makeItinerary(input, withMeal(input, places));
  return withinBudget(input, result) ? result : input.itinerary;
}

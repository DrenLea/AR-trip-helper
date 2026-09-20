import { describe, expect, it } from 'vitest';
import { getCityPack } from '../../../city-packs/registry';
import { paceProfiles } from '../../../features/planning/paceProfiles';
import { planDay, summarizeTransitLeg } from '../buildItinerary';

const inputFor = (city: string, pace: string) => ({
  cityPack: getCityPack(city), date: '2026-10-03', startPlaceId: city + '-hotel', endPlaceId: city + '-hotel',
  interests: { history: 2, culture: 2, nature: 1, food: 1 }, constraints: { ...paceProfiles[pace].constraints }
});
describe('planner', () => {
  it.each(['rome', 'guiyang'])('creates distinct, budget-valid pace routes in %s', city => {
    const plans = Object.keys(paceProfiles).map(pace => {
      const input = inputFor(city, pace), plan = planDay(input);
      expect(plan.totals.steps).toBeGreaterThan(0);
      expect(plan.totals.steps).toBeLessThanOrEqual(input.constraints.maxDailySteps);
      expect(plan.totals.durationMin).toBeLessThanOrEqual(540);
      expect(plan.legs.filter(l => l.mode === 'walk').every(l => (l.distanceM ?? 0) <= input.constraints.maxSingleWalkM)).toBe(true);
      expect(plan.explanations.some(e => e.code === 'effort-estimate')).toBe(true);
      expect(plan.effort?.label).toContain('估算');
      expect(plan.legs.filter(l => l.mode === 'other').every(l => !l.routeRef && (l.walkingDistanceM ?? 0) > 0)).toBe(true);
      return plan;
    });
    expect(plans.map(p => p.stops.filter(s => !['rest', 'meal'].includes(s.kind)).length)).toEqual([1, 2, 3]);
    expect(plans[0].totals.steps).toBeLessThan(plans[1].totals.steps);
    expect(plans[1].totals.steps).toBeLessThan(plans[2].totals.steps);
    expect(plans.map(p => p.effort?.level)).toEqual(['light', 'moderate', 'high']);
    expect(new Set(plans.map(p => p.totals.restMin)).size).toBe(3);
  });
  it('adds more rest with a shorter interval and schedules chronological stops', () => {
    const input = inputFor('rome', '一天多看一些');
    const frequent = planDay({ ...input, constraints: { ...input.constraints, restEveryMin: 35, mealWindows: [] } });
    const sparse = planDay({ ...input, constraints: { ...input.constraints, restEveryMin: 180, mealWindows: [] } });
    expect(frequent.totals.restMin).toBeGreaterThan(sparse.totals.restMin!);
    frequent.stops.forEach((stop, index) => {
      expect(stop.arrival! < stop.departure!).toBe(true);
      if (index) expect(stop.arrival! >= frequent.stops[index - 1].departure!).toBe(true);
    });
  });
  it('does not force parks or meals into an infeasible step or time budget', () => {
    const input = inputFor('guiyang', '一天多看一些');
    for (const constraints of [{ ...input.constraints, maxDailySteps: 100 }, { ...input.constraints, dayEnd: '09:15' }]) {
      const plan = planDay({ ...input, constraints });
      expect(plan.stops).toHaveLength(0);
      expect(plan.explanations.some(e => e.code === 'no-feasible-visits')).toBe(true);
    }
  });
  it('respects wheelchair exclusions', () => {
    const input = inputFor('guiyang', '一天多看一些');
    expect(planDay({ ...input, constraints: { ...input.constraints, wheelchairMode: true } }).stops.some(s => s.placeId === 'guiyang-old-town')).toBe(false);
  });
  it('labels legacy sample transit metadata as unverified', () => {
    const display = summarizeTransitLeg({ mode: 'transit', from: 'rome-colosseum', to: 'rome-pantheon', durationMin: 24, transfers: 1, routeRef: 'rome-bus-87', riskFlags: [], dataFreshAt: '2026-09-19' });
    expect(display.routeName).toContain('87');
    expect(display.routeName).toContain('待核实');
    expect(display.departure).toBe('待查询');
  });
});

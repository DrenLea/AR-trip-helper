# AR Trip Helper MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android-first PWA MVP that plans accessible, transit-aware free-trip itineraries for Rome and Guiyang, with explainable constraints, AR/content fallback, trip sharing, progress sync, and SOS simulation.

**Architecture:** The app uses a reusable planning core that consumes internal domain models only. City-specific data, transit assumptions, POI content, AR assets, and accessibility rules live in city packs and adapters. A lightweight Node sync API supports share sessions, event logs, progress heartbeats, and SOS records for the hackathon demo.

**Tech Stack:** TypeScript, React, Vite, Vitest, React Testing Library, Playwright, vite-plugin-pwa, Leaflet/OpenStreetMap tiles, `<model-viewer>`, Express, nanoid, local JSON fixtures.

**Spec:** `docs/superpowers/specs/2026-09-19-ar-trip-helper-design.md`

## Global Constraints

- Target platform: Android-first PWA, Chrome primary.
- MVP cities: Rome for historical culture AR; Guiyang for accessibility, walking effort, rest cadence, and transit-aware physical planning.
- New cities must be added by city packs and adapters, without editing planner core logic.
- Review/rating sources must use official APIs, licensed fields, external links, or bundled sample fixtures; do not scrape Dianping, Yelp, TripAdvisor, Ctrip, Google Places, or similar sites without authorization.
- AR assets must record source URL, license, attribution, redistributable flag, and last checked date.
- Do not generate or self-host unlicensed 3D heritage assets; prefer linked or embeddable online glTF/GLB/WebXR resources.
- Unknown accessibility status must be shown as unknown, never as accessible.
- Exact location sharing is off by default and requires explicit traveler opt-in.
- Progress sync is low-frequency: every 5-10 minutes or on itinerary node events; no continuous background tracking claim.
- SOS does not claim automatic police, hospital, or rescue dispatch; it records notification attempts and exposes local emergency phone entry points.
- Rome emergency phone target: `112`; Guiyang emergency phone targets: `110`, `120`, `119`.
- Permissions for camera, location, motion sensors, and notifications are requested only after the user chooses a feature that needs them.

---

## File Structure

- Create `package.json`: npm scripts, dependencies, test commands, and concurrent dev workflow.
- Create `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`: PWA build, lint, and test configuration.
- Create `public/manifest.webmanifest`, `public/icons/README.md`: Android PWA install metadata and icon generation notes.
- Create `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/app.css`: React entry, app composition, design tokens, and responsive styling.
- Create `src/domain/models.ts`: shared domain types for places, legs, itineraries, constraints, explanations, city packs, AR assets, sharing, progress, and SOS.
- Create `src/domain/planner/score.ts`: scoring and penalty functions.
- Create `src/domain/planner/constraints.ts`: hard-constraint filtering for hours, steps, walking segment limits, meals, rests, and accessibility.
- Create `src/domain/planner/buildItinerary.ts`: weighted greedy route builder plus local replacement helper.
- Create `src/domain/planner/explanations.ts`: recommendation and exclusion explanation generation.
- Create `src/domain/planner/__tests__/planner.test.ts`: planner unit tests.
- Create `src/city-packs/registry.ts`: city pack lookup and typed registration.
- Create `src/city-packs/rome.ts`, `src/city-packs/guiyang.ts`: demo city packs and local sample data.
- Create `src/city-packs/__tests__/cityPacks.test.ts`: city pack contract tests.
- Create `src/data/rome.places.json`, `src/data/guiyang.places.json`, `src/data/demo-transit.json`, `src/data/heritage-assets.json`: small licensed or clearly marked sample fixtures.
- Create `src/features/planning/PlanningState.ts`, `src/features/planning/usePlanner.ts`: app-facing planning state and actions.
- Create `src/features/planning/components/*.tsx`: constraints form, itinerary timeline, map panel, effort dashboard, explanation drawer, POI replacement list.
- Create `src/features/ar/ArResolver.ts`, `src/features/ar/components/ArPanel.tsx`, `src/features/ar/components/NarrationCard.tsx`: device capability checks, content fallback, narration playback.
- Create `src/features/share/ShareClient.ts`, `src/features/share/useTripShare.ts`, `src/features/share/components/*.tsx`: share creation, guardian view, progress status, and QR/link UI.
- Create `src/features/safety/SosController.ts`, `src/features/safety/components/SosButton.tsx`, `src/features/safety/components/EmergencySheet.tsx`: long-press SOS flow and local emergency phone actions.
- Create `server/index.ts`, `server/store.ts`, `server/routes.ts`, `server/types.ts`: local sync API for share sessions, trip events, heartbeats, and SOS events.
- Create `server/__tests__/sync-api.test.ts`: API behavior tests.
- Create `tests/e2e/android-demo.spec.ts`: Playwright smoke tests for the Android-sized core journey.
- Create `docs/data-sources.md`: source, license, attribution, update time, and production-readiness notes.
- Create `docs/demo-script.md`: three-minute demo script covering Rome, Guiyang, sharing, and SOS.

---

### Task 1: Project Scaffold and Quality Gates

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `eslint.config.js`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/README.md`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint`
- Produces: React root component `App(): JSX.Element`

- [ ] **Step 1: Create npm project metadata**

```json
{
  "name": "ar-trip-helper",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"vite --host 0.0.0.0\" \"tsx watch server/index.ts\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "concurrently": "^9.0.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "@google/model-viewer": "^4.0.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.468.0",
    "nanoid": "^5.0.7",
    "qrcode": "^1.5.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsx": "^4.19.0",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^1.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/leaflet": "^1.9.14",
    "@types/node": "^22.10.0",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "eslint": "^9.17.0",
    "globals": "^15.14.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Add Vite, TypeScript, Vitest, and Playwright config**

Use React, path-free imports, `jsdom` for component tests, Playwright `webServer` with `npm run dev`, and an ESLint flat config that covers TypeScript, React JSX, browser globals, and Node globals for `server`.

- [ ] **Step 3: Add PWA manifest**

Set app name to `AR Trip Helper`, display mode to `standalone`, orientation to `portrait`, start URL to `/`, theme color to `#153b3c`, and include concrete icon paths documented in `public/icons/README.md`.

- [ ] **Step 4: Add minimal app shell**

`App.tsx` should render city tabs, a constraints region, itinerary region, map region, AR/content region, and safety/share region with real labels and deterministic seed-state content. Keep the first screen as the usable planning tool, not a marketing landing page.

- [ ] **Step 5: Run install and scaffold checks**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds and Vite emits `dist`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json vitest.config.ts playwright.config.ts eslint.config.js public src
git commit -m "chore: scaffold Android-first PWA"
```

---

### Task 2: Domain Models and Fixture Contracts

**Files:**
- Create: `src/domain/models.ts`
- Create: `src/data/rome.places.json`
- Create: `src/data/guiyang.places.json`
- Create: `src/data/demo-transit.json`
- Create: `src/data/heritage-assets.json`
- Create: `src/domain/__tests__/models.test.ts`

**Interfaces:**
- Produces: `Place`, `Leg`, `Stop`, `Itinerary`, `PlanningConstraints`, `CityPack`, `HeritageAsset`, `ShareSession`, `TripEvent`, `ProgressHeartbeat`, `EmergencyEvent`
- Produces: `assertPlace(value: unknown): Place`
- Produces: `assertCityPack(value: unknown): CityPack`

- [ ] **Step 1: Write failing model validation tests**

```ts
import { describe, expect, it } from 'vitest';
import { assertPlace } from '../models';

it('rejects unknown accessibility promoted as accessible', () => {
  const value = {
    id: 'rome-colosseum',
    cityId: 'rome',
    name: 'Colosseum',
    category: 'sight',
    lat: 41.8902,
    lon: 12.4922,
    interestTags: ['history'],
    access: { stepFree: 'unknown', slopeRisk: 'low' },
    sourceRefs: [{ source: 'Wikidata', url: 'https://www.wikidata.org/wiki/Q10285', license: 'CC0', retrievedAt: '2026-09-19' }]
  };

  expect(assertPlace(value).access?.stepFree).toBe('unknown');
});

it('requires asset license metadata', () => {
  const place = {
    id: 'rome-forum',
    cityId: 'rome',
    name: 'Roman Forum',
    category: 'sight',
    lat: 41.8925,
    lon: 12.4853,
    interestTags: ['archaeology'],
    sourceRefs: []
  };

  expect(() => assertPlace(place)).toThrow('sourceRefs');
});
```

- [ ] **Step 2: Implement TypeScript domain types**

Include literal unions for city IDs, categories, transit modes, explanation severities, share roles, share scopes, event types, heartbeat statuses, and location precision.

- [ ] **Step 3: Implement runtime guards**

`assertPlace` and `assertCityPack` must throw readable errors for missing `id`, `cityId`, `name`, coordinates, `category`, `interestTags`, or `sourceRefs`.

- [ ] **Step 4: Add compact demo fixtures**

Rome fixture must include `Colosseum`, `Roman Forum`, `Pantheon`, one meal stop, one rest stop, and one linked heritage asset. Guiyang fixture must include `Jiaxiu Tower`, `Qianlingshan Park`, one meal stop, one rest stop, and explicit `stepFree` values of `yes`, `no`, and `unknown` across entries.

- [ ] **Step 5: Run model tests**

Run: `npm run test -- src/domain/__tests__/models.test.ts`
Expected: all model guard tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain src/data
git commit -m "feat: add shared trip domain models"
```

---

### Task 3: City Pack Registry

**Files:**
- Create: `src/city-packs/registry.ts`
- Create: `src/city-packs/rome.ts`
- Create: `src/city-packs/guiyang.ts`
- Create: `src/city-packs/__tests__/cityPacks.test.ts`

**Interfaces:**
- Consumes: `CityPack`, `Place`, `HeritageAsset`
- Produces: `getCityPack(cityId: CityId): CityPack`
- Produces: `listCityPacks(): CityPackSummary[]`
- Produces: `CityPack.rules.emergencyTargets: string[]`

- [ ] **Step 1: Write failing registry tests**

```ts
import { describe, expect, it } from 'vitest';
import { getCityPack, listCityPacks } from '../registry';

it('registers Rome and Guiyang without changing planner code', () => {
  expect(listCityPacks().map((city) => city.id)).toEqual(['rome', 'guiyang']);
});

it('uses correct emergency phone targets by city', () => {
  expect(getCityPack('rome').rules.emergencyTargets).toEqual(['112']);
  expect(getCityPack('guiyang').rules.emergencyTargets).toEqual(['110', '120', '119']);
});
```

- [ ] **Step 2: Implement `rome.ts`**

Load Rome places and heritage assets from JSON fixtures. Set walking effort multiplier to `1.0`, default public transit label to `ATAC/GTFS sample`, and historical theme tags to `ancient-rome`, `archaeology`, `renaissance`.

- [ ] **Step 3: Implement `guiyang.ts`**

Load Guiyang places from JSON fixtures. Set walking effort multiplier to `1.25`, slope risk multiplier to `1.4`, default public transit label to `Guiyang transit sample`, and accessibility theme tags to `step-free`, `low-slope`, `rest-friendly`.

- [ ] **Step 4: Implement `registry.ts`**

Use an internal readonly array `cityPacks` and throw `Unsupported city: ${cityId}` for unknown city IDs.

- [ ] **Step 5: Run registry tests**

Run: `npm run test -- src/city-packs/__tests__/cityPacks.test.ts`
Expected: city registration and emergency target tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/city-packs src/data
git commit -m "feat: register reusable city packs"
```

---

### Task 4: Constraint Planner Core

**Files:**
- Create: `src/domain/planner/score.ts`
- Create: `src/domain/planner/constraints.ts`
- Create: `src/domain/planner/buildItinerary.ts`
- Create: `src/domain/planner/explanations.ts`
- Create: `src/domain/planner/__tests__/planner.test.ts`

**Interfaces:**
- Consumes: `CityPack`, `PlanningConstraints`, `Place`
- Produces: `planDay(input: PlanDayInput): Itinerary`
- Produces: `replaceStop(input: ReplaceStopInput): Itinerary`
- Produces: `scorePlace(place: Place, context: ScoreContext): ScoreBreakdown`
- Produces: `filterCandidates(input: FilterCandidatesInput): CandidateFilterResult`

- [ ] **Step 1: Write failing planner tests**

```ts
import { describe, expect, it } from 'vitest';
import { getCityPack } from '../../city-packs/registry';
import { planDay } from '../buildItinerary';

it('keeps total steps under the user budget', () => {
  const itinerary = planDay({
    cityPack: getCityPack('guiyang'),
    date: '2026-10-03',
    startPlaceId: 'guiyang-hotel',
    endPlaceId: 'guiyang-hotel',
    interests: { history: 2, food: 1, nature: 1 },
    constraints: {
      maxDailySteps: 6500,
      maxSingleWalkM: 900,
      restEveryMin: 70,
      mealWindows: [{ type: 'lunch', start: '12:00', end: '13:30' }],
      wheelchairMode: true
    }
  });

  expect(itinerary.totals.steps).toBeLessThanOrEqual(6500);
  expect(itinerary.legs.every((leg) => (leg.distanceM ?? 0) <= 900 || leg.mode === 'transit')).toBe(true);
});

it('does not mark unknown accessibility as accessible', () => {
  const itinerary = planDay({
    cityPack: getCityPack('guiyang'),
    date: '2026-10-03',
    startPlaceId: 'guiyang-hotel',
    endPlaceId: 'guiyang-hotel',
    interests: { culture: 1 },
    constraints: {
      maxDailySteps: 9000,
      maxSingleWalkM: 1200,
      restEveryMin: 90,
      mealWindows: [{ type: 'lunch', start: '12:00', end: '13:30' }],
      wheelchairMode: true
    }
  });

  expect(itinerary.explanations.some((item) => item.message.includes('无障碍状态未知'))).toBe(true);
});
```

- [ ] **Step 2: Implement distance and step estimation**

Use haversine distance for straight-line fallback, multiply walking distance by city walking effort multiplier, and convert steps with `steps = Math.ceil(walkM / 0.72)`.

- [ ] **Step 3: Implement hard filters**

Filter out closed POIs when opening hours are known, known inaccessible POIs in wheelchair mode, candidates that break max single walk distance, and candidates that cannot fit inside the day window after meal/rest insertion.

- [ ] **Step 4: Implement weighted greedy route**

Pick at most four non-rest/non-meal POIs for one-day MVP. Score by interests, rating confidence, transit convenience, culture/accessibility tags, walking burden, slope risk, backtracking estimate, and stale data warning. Insert meal and rest stops into the nearest available windows.

- [ ] **Step 5: Implement local replacement**

`replaceStop` accepts `lockedPlaceIds` and `replacementPlaceId`; it rebuilds only the open segment between locked stops and preserves prior event-compatible stop IDs.

- [ ] **Step 6: Implement explanations**

Return positive and negative explanation rows with `code`, `severity`, `placeId`, `message`, and `sourceRefs`. Include reasons for exclusion, downgrade, unknown accessibility, over-budget candidates, transit uncertainty, and AR fallback.

- [ ] **Step 7: Run planner tests**

Run: `npm run test -- src/domain/planner/__tests__/planner.test.ts`
Expected: all constraint, score, and explanation tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/planner
git commit -m "feat: add explainable constraint planner"
```

---

### Task 5: Transit and Map Rendering

**Files:**
- Create: `src/features/map/MapView.tsx`
- Create: `src/features/map/mapStyles.ts`
- Create: `src/features/map/__tests__/MapView.test.tsx`
- Modify: `src/domain/planner/buildItinerary.ts`
- Modify: `src/data/demo-transit.json`

**Interfaces:**
- Consumes: `Itinerary.legs`
- Produces: `TransitLegDisplay = { routeName: string; fromStop: string; toStop: string; departure: string; arrival: string; source: string; freshAt: string }`
- Produces: `MapView({ itinerary }: { itinerary: Itinerary }): JSX.Element`

- [ ] **Step 1: Write failing transit summary test**

```ts
import { describe, expect, it } from 'vitest';
import { summarizeTransitLeg } from '../../domain/planner/buildItinerary';

it('shows line, transfer, source, and freshness for transit legs', () => {
  const summary = summarizeTransitLeg({
    mode: 'transit',
    from: 'rome-colosseum',
    to: 'rome-pantheon',
    durationMin: 24,
    transfers: 1,
    routeRef: 'rome-bus-87',
    riskFlags: [],
    dataFreshAt: '2026-09-19'
  });

  expect(summary.routeName).toContain('87');
  expect(summary.source).toContain('GTFS');
  expect(summary.freshAt).toBe('2026-09-19');
});
```

- [ ] **Step 2: Implement transit sample lookup**

Map `routeRef` values in `demo-transit.json` to line name, operator, stops, transfer count, source, and freshness date.

- [ ] **Step 3: Add Leaflet map component**

Render OSM tiles, POI markers, numbered stop order, walking polylines, and transit leg lines. Include attribution text from Leaflet/OSM.

- [ ] **Step 4: Add accessible map fallback**

When map tiles fail or JavaScript map initialization fails, render a text route summary with each stop name, leg mode, duration, distance, and transfer count.

- [ ] **Step 5: Run component and planner tests**

Run: `npm run test -- src/features/map/__tests__/MapView.test.tsx src/domain/planner/__tests__/planner.test.ts`
Expected: transit summary and map fallback tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/map src/domain/planner src/data/demo-transit.json
git commit -m "feat: show transit-aware itinerary map"
```

---

### Task 6: Planning UI and Android App Flow

**Files:**
- Create: `src/features/planning/PlanningState.ts`
- Create: `src/features/planning/usePlanner.ts`
- Create: `src/features/planning/components/ConstraintPanel.tsx`
- Create: `src/features/planning/components/EffortDashboard.tsx`
- Create: `src/features/planning/components/ItineraryTimeline.tsx`
- Create: `src/features/planning/components/ExplanationDrawer.tsx`
- Create: `src/features/planning/components/ReplacementSheet.tsx`
- Create: `src/features/planning/__tests__/planning-ui.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `getCityPack`, `planDay`, `replaceStop`
- Produces: `usePlanner(initialCityId: CityId): PlanningViewModel`
- Produces: `PlanningViewModel.actions.setCity`, `setConstraint`, `lockStop`, `replaceStop`, `shortenDay`, `selectStop`

- [ ] **Step 1: Produce one compact UI concept before implementation**

Create one primary Android-sized concept for the app workspace: top city switcher, constraints drawer, map/timeline split, effort dashboard, AR drawer, share/SOS controls. Record approved tokens in `src/styles/tokens.css` during implementation.

- [ ] **Step 2: Write failing UI tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';

it('updates the itinerary when the user lowers the step budget', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('tab', { name: '贵阳' }));
  await userEvent.clear(screen.getByLabelText('每日步数上限'));
  await userEvent.type(screen.getByLabelText('每日步数上限'), '5000');
  await userEvent.click(screen.getByRole('button', { name: '重新规划' }));

  expect(screen.getByText(/预计步数/)).toBeInTheDocument();
  expect(screen.getByText(/不超过 5000/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Implement planning state hook**

Keep state local and deterministic. Store selected city, constraints, itinerary, selected stop, locked stop IDs, and latest explanation list.

- [ ] **Step 4: Implement constraint controls**

Use large touch targets for city, interests, step limit, single-walk limit, rest interval, lunch window, wheelchair mode, and low-slope preference. Use native inputs, toggles, and segmented controls.

- [ ] **Step 5: Implement itinerary timeline and effort dashboard**

Show arrival/departure times, POI names, leg mode, walking distance, estimated steps, transit line, transfers, rest/meal markers, total steps, longest walking segment, rest cadence, and backtracking estimate.

- [ ] **Step 6: Implement explanations and replacement**

Display why a POI was recommended or excluded. Allow lock/unlock and replacing one unlocked stop, then call `replaceStop`.

- [ ] **Step 7: Verify Android-size layout**

Run: `npm run test -- src/features/planning/__tests__/planning-ui.test.tsx`
Run: `npm run build`
Run: `npm run dev`
Open at a 390x844 viewport and verify no clipped controls, overlapping labels, or unreadable timeline rows.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/features/planning src/styles
git commit -m "feat: build Android planning workflow"
```

---

### Task 7: Narration and AR Fallback

**Files:**
- Create: `src/features/ar/ArResolver.ts`
- Create: `src/features/ar/components/ArPanel.tsx`
- Create: `src/features/ar/components/NarrationCard.tsx`
- Create: `src/features/ar/__tests__/ar.test.tsx`
- Modify: `src/data/heritage-assets.json`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `HeritageAsset`, `Place`, browser feature probes
- Produces: `resolveArMode(input: ArResolveInput): ArModeResult`
- Produces: `ArMode = 'webxr' | 'camera-overlay' | 'model-viewer' | 'link-only'`
- Produces: `NarrationCard({ place, language }: NarrationCardProps): JSX.Element`

- [ ] **Step 1: Write failing AR resolver tests**

```ts
import { describe, expect, it } from 'vitest';
import { resolveArMode } from '../ArResolver';

it('falls back to model-viewer when WebXR is unavailable and a GLB exists', () => {
  const result = resolveArMode({
    capabilities: { webXr: false, camera: true, deviceOrientation: true },
    asset: {
      id: 'rome-colosseum-glb',
      placeId: 'rome-colosseum',
      type: 'glb',
      url: 'https://example.org/colosseum.glb',
      license: 'CC BY',
      attribution: 'Sample source',
      sourceUrl: 'https://example.org/source',
      redistributable: false,
      checkedAt: '2026-09-19'
    }
  });

  expect(result.mode).toBe('model-viewer');
  expect(result.reason).toContain('WebXR unavailable');
});
```

- [ ] **Step 2: Implement device capability detection**

Expose a pure `resolveArMode` function and a browser wrapper that checks WebXR, camera availability, device orientation, and asset type. Keep permissions lazy until the user taps AR.

- [ ] **Step 3: Implement narration card**

Render 30-60 second Chinese text, optional English text, source refs, era label, confidence label, and a speech synthesis play/pause button using the Web Speech API when available.

- [ ] **Step 4: Implement AR panel**

If mode is `webxr`, show a start button and capability notice. If mode is `camera-overlay`, show camera permission entry and compass-style overlay. If mode is `model-viewer`, render `<model-viewer src="...">`. If mode is `link-only`, show the source link and attribution.

- [ ] **Step 5: Run AR tests and build**

Run: `npm run test -- src/features/ar/__tests__/ar.test.tsx`
Run: `npm run build`
Expected: tests and production build pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/ar src/data/heritage-assets.json src/App.tsx
git commit -m "feat: add narration and AR fallback"
```

---

### Task 8: Share Sync API

**Files:**
- Create: `server/types.ts`
- Create: `server/store.ts`
- Create: `server/routes.ts`
- Create: `server/index.ts`
- Create: `server/__tests__/sync-api.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ShareSession`, `TripEvent`, `ProgressHeartbeat`, `EmergencyEvent`
- Produces: `POST /api/share-sessions`
- Produces: `GET /api/share-sessions/:token`
- Produces: `POST /api/trips/:tripId/events`
- Produces: `GET /api/trips/:tripId/events?afterVersion=number`
- Produces: `POST /api/trips/:tripId/heartbeat`
- Produces: `GET /api/trips/:tripId/heartbeat/latest`

- [ ] **Step 1: Write failing API tests**

```ts
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../routes';
import { createMemoryStore } from '../store';

it('creates a short-lived caregiver share session with minimal scopes', async () => {
  const app = createApp(createMemoryStore());
  const response = await request(app)
    .post('/api/share-sessions')
    .send({ tripId: 'trip-rome-demo', role: 'caregiver', scopes: ['itinerary', 'progress', 'coarse_location'], ttlHours: 24 });

  expect(response.status).toBe(201);
  expect(response.body.token).toHaveLength(32);
  expect(response.body.session.scopes).not.toContain('precise_location');
});

it('returns only events after the requested version', async () => {
  const app = createApp(createMemoryStore());
  await request(app).post('/api/trips/trip-rome-demo/events').send({ type: 'arrived', placeId: 'rome-colosseum' });
  await request(app).post('/api/trips/trip-rome-demo/events').send({ type: 'delayed', payload: { minutes: 12 } });

  const response = await request(app).get('/api/trips/trip-rome-demo/events?afterVersion=1');
  expect(response.body.events).toHaveLength(1);
  expect(response.body.events[0].version).toBe(2);
});
```

- [ ] **Step 2: Add test dependency**

Install `supertest` and `@types/supertest` as dev dependencies.

- [ ] **Step 3: Implement memory store**

Store share sessions by random token, events by trip ID with monotonically increasing version, latest heartbeat by trip ID, and emergency events by trip ID.

- [ ] **Step 4: Implement route validation**

Reject share scopes outside the selected role, reject `ttlHours` outside `1..168`, reject precise location when not explicitly requested, and return `410` for expired or revoked share sessions.

- [ ] **Step 5: Run API tests**

Run: `npm run test -- server/__tests__/sync-api.test.ts`
Expected: share session, event, and heartbeat API tests pass.

- [ ] **Step 6: Commit**

```bash
git add server package.json package-lock.json
git commit -m "feat: add trip sharing sync API"
```

---

### Task 9: Share, Progress, and Guardian UI

**Files:**
- Create: `src/features/share/ShareClient.ts`
- Create: `src/features/share/useTripShare.ts`
- Create: `src/features/share/components/ShareSheet.tsx`
- Create: `src/features/share/components/GuardianView.tsx`
- Create: `src/features/share/components/ProgressPanel.tsx`
- Create: `src/features/share/__tests__/share-ui.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Sync API routes from Task 8
- Produces: `ShareClient.createSession(input: CreateShareSessionInput): Promise<ShareSessionResponse>`
- Produces: `ShareClient.appendTripEvent(tripId: string, event: TripEventDraft): Promise<TripEvent>`
- Produces: `ShareClient.sendHeartbeat(heartbeat: ProgressHeartbeat): Promise<void>`
- Produces: `useTripShare(tripId: string): TripShareViewModel`

- [ ] **Step 1: Write failing share UI tests**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShareSheet } from '../components/ShareSheet';

it('creates a caregiver link without precise location by default', async () => {
  const createSession = vi.fn().mockResolvedValue({
    url: 'http://localhost:5173/share/demo-token',
    session: { scopes: ['itinerary', 'progress', 'coarse_location'] }
  });

  render(<ShareSheet tripId="trip-rome-demo" createSession={createSession} />);
  await userEvent.click(screen.getByRole('button', { name: '生成家属链接' }));

  await waitFor(() => expect(createSession).toHaveBeenCalled());
  expect(createSession.mock.calls[0][0].scopes).not.toContain('precise_location');
});
```

- [ ] **Step 2: Implement API client**

Use `fetch` with JSON, throw `SyncApiError` on non-2xx status, and keep endpoint base URL configurable through `VITE_SYNC_API_BASE`.

- [ ] **Step 3: Implement share sheet**

Support caregiver and companion roles, 24-hour and 7-day expiry, coarse location default, exact location toggle, generated URL, QR code canvas, revoke copy, and last share status.

- [ ] **Step 4: Implement progress events**

Append `arrived`, `skipped`, `delayed`, `rerouted`, `locked`, and `unlocked` events from user actions. Send heartbeat on stop arrival and manual progress update.

- [ ] **Step 5: Implement guardian route**

Use URL path `/share/:token`. Render read-only itinerary, current node, latest progress status, last update time, battery if present, location precision label, and stale-data warning when heartbeat age is greater than 15 minutes.

- [ ] **Step 6: Run share tests and build**

Run: `npm run test -- src/features/share/__tests__/share-ui.test.tsx`
Run: `npm run build`
Expected: share UI and production build pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/share src/App.tsx
git commit -m "feat: add caregiver trip sharing UI"
```

---

### Task 10: SOS Safety Flow

**Files:**
- Create: `src/features/safety/SosController.ts`
- Create: `src/features/safety/components/SosButton.tsx`
- Create: `src/features/safety/components/EmergencySheet.tsx`
- Create: `src/features/safety/__tests__/sos.test.tsx`
- Modify: `server/routes.ts`
- Modify: `server/store.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `CityPack.rules.emergencyTargets`, latest heartbeat, share contacts
- Produces: `createEmergencyEvent(input: EmergencyEventDraft): Promise<EmergencyEvent>`
- Produces: `SosButton({ cityPack, tripId, latestHeartbeat, notifyContacts }: SosButtonProps): JSX.Element`
- Produces: `POST /api/trips/:tripId/emergency-events`

- [ ] **Step 1: Write failing SOS tests**

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SosButton } from '../components/SosButton';

it('requires long press before starting the cancel countdown', async () => {
  vi.useFakeTimers();
  const notifyContacts = vi.fn();
  render(<SosButton cityId="rome" tripId="trip-rome-demo" emergencyTargets={['112']} notifyContacts={notifyContacts} />);

  await userEvent.pointer([{ keys: '[MouseLeft>]', target: screen.getByRole('button', { name: 'SOS' }) }]);
  act(() => vi.advanceTimersByTime(1900));
  expect(screen.queryByText(/10 秒内可取消/)).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByText(/10 秒内可取消/)).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Implement SOS state machine**

States: `idle`, `holding`, `countdown`, `sending`, `sent`, `failed`, `cancelled`. Holding threshold is 2000 ms. Cancel window is 10000 ms.

- [ ] **Step 3: Implement emergency API endpoint**

Store emergency event with location precision, contact notification result labels, selected call target, and cancelled timestamp when the user cancels within the window.

- [ ] **Step 4: Implement emergency sheet**

Show city emergency numbers, phone links using `tel:`, last known update time, location precision, notification status, and disclaimer text: `本功能仅通知已授权联系人，不代表已联系警方、医院或救援机构。`

- [ ] **Step 5: Run SOS tests and API tests**

Run: `npm run test -- src/features/safety/__tests__/sos.test.tsx server/__tests__/sync-api.test.ts`
Expected: SOS state machine and emergency API tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/safety server src/App.tsx
git commit -m "feat: add SOS safety workflow"
```

---

### Task 11: Offline, Permissions, and PWA Resilience

**Files:**
- Create: `src/platform/capabilities.ts`
- Create: `src/platform/offlineStore.ts`
- Create: `src/platform/__tests__/offline.test.ts`
- Modify: `vite.config.ts`
- Modify: `src/features/ar/ArResolver.ts`
- Modify: `src/features/share/useTripShare.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `detectCapabilities(): Promise<DeviceCapabilities>`
- Produces: `saveLastItinerary(itinerary: Itinerary): Promise<void>`
- Produces: `loadLastItinerary(): Promise<Itinerary | null>`
- Produces: `queueOfflineTripEvent(event: TripEventDraft): Promise<void>`
- Produces: `flushOfflineTripEvents(client: ShareClient): Promise<FlushResult>`

- [ ] **Step 1: Write failing offline tests**

```ts
import { describe, expect, it } from 'vitest';
import { createMemoryOfflineStore } from '../offlineStore';

it('keeps the latest itinerary but does not cache exact trajectory history', async () => {
  const store = createMemoryOfflineStore();
  await store.saveLastItinerary({ cityId: 'rome', date: '2026-10-03', stops: [], legs: [], totals: { steps: 0, walkM: 0, transitMin: 0, transfers: 0, backtrackM: 0 }, explanations: [], freshness: { sources: [] } });
  await store.queueOfflineTripEvent({ type: 'arrived', placeId: 'rome-colosseum', lat: 41.8902, lon: 12.4922 });

  const queued = await store.listQueuedTripEvents();
  expect(queued[0]).not.toHaveProperty('lat');
  expect(queued[0]).not.toHaveProperty('lon');
});
```

- [ ] **Step 2: Configure service worker**

Use `vite-plugin-pwa` to precache app shell, latest itinerary view, city fixture JSON, and core CSS. Do not precache exact location heartbeats.

- [ ] **Step 3: Implement offline store**

Use IndexedDB when available and memory fallback in tests. Store last itinerary, unsent trip events without exact coordinates, and last content manifest freshness.

- [ ] **Step 4: Implement permission-aware capability checks**

Detect location, camera, device orientation, notification, and WebXR capability. Return `available`, `promptable`, `denied`, or `unsupported` for each.

- [ ] **Step 5: Run resilience tests and build**

Run: `npm run test -- src/platform/__tests__/offline.test.ts`
Run: `npm run build`
Expected: offline tests and PWA build pass.

- [ ] **Step 6: Commit**

```bash
git add src/platform vite.config.ts src/features/ar src/features/share src/App.tsx
git commit -m "feat: add offline and permission resilience"
```

---

### Task 12: End-to-End Android Demo QA

**Files:**
- Create: `tests/e2e/android-demo.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `docs/demo-script.md`

**Interfaces:**
- Consumes: built PWA, sync API, city packs, planner UI, AR panel, share UI, SOS flow
- Produces: Playwright tests for Android-sized viewport core workflows

- [ ] **Step 1: Write Playwright smoke tests**

```ts
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('Rome cultural route shows transit, narration, AR fallback, and share link', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '罗马' }).click();
  await page.getByRole('button', { name: '重新规划' }).click();
  await expect(page.getByText(/公共交通/)).toBeVisible();
  await page.getByRole('button', { name: /解说/ }).first().click();
  await expect(page.getByText(/来源/)).toBeVisible();
  await expect(page.getByText(/AR/)).toBeVisible();
  await page.getByRole('button', { name: '生成家属链接' }).click();
  await expect(page.getByText(/24 小时/)).toBeVisible();
});

test('Guiyang route respects step and accessibility constraints', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '贵阳' }).click();
  await page.getByLabel('轮椅或助行器优先').check();
  await page.getByLabel('每日步数上限').fill('5000');
  await page.getByRole('button', { name: '重新规划' }).click();
  await expect(page.getByText(/无障碍状态未知/)).toBeVisible();
  await expect(page.getByText(/不超过 5000/)).toBeVisible();
});
```

- [ ] **Step 2: Add web server settings**

Configure Playwright to run `npm run dev`, wait for `http://127.0.0.1:5173`, and reuse an existing local server when available.

- [ ] **Step 3: Add demo script**

Document a three-minute sequence: Rome route planning, transit leg, Colosseum narration and AR fallback, share link generation, guardian view, Guiyang accessibility planning, SOS long press and cancel.

- [ ] **Step 4: Run e2e tests**

Run: `npm run test:e2e`
Expected: both Android-sized smoke tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e playwright.config.ts docs/demo-script.md
git commit -m "test: add Android demo smoke coverage"
```

---

### Task 13: Data Source and License Documentation

**Files:**
- Create: `docs/data-sources.md`
- Modify: `src/data/heritage-assets.json`
- Modify: `src/data/rome.places.json`
- Modify: `src/data/guiyang.places.json`

**Interfaces:**
- Consumes: fixture `sourceRefs` and `assetPolicy`
- Produces: human-readable data source and license table

- [ ] **Step 1: Add source table**

Include columns: `Dataset`, `City`, `Used For`, `Source URL`, `License`, `Redistribution`, `Retrieved At`, `Production Status`, `Notes`.

- [ ] **Step 2: Document review platform policy**

State that Dianping, Yelp, TripAdvisor, Ctrip, Google Places, and similar providers are integration candidates only through official API, partner export, user-provided export, or external link; the MVP ships curated sample ratings with source and freshness labels.

- [ ] **Step 3: Document AR asset policy**

State that assets with missing license metadata are excluded, `redistributable=false` assets are linked or embedded remotely, and every asset must preserve attribution near the AR/3D viewer.

- [ ] **Step 4: Add fixture consistency test**

Extend `src/domain/__tests__/models.test.ts` so every place has at least one source ref and every heritage asset has `license`, `attribution`, `sourceUrl`, `redistributable`, and `checkedAt`.

- [ ] **Step 5: Run data tests**

Run: `npm run test -- src/domain/__tests__/models.test.ts`
Expected: data source metadata tests pass.

- [ ] **Step 6: Commit**

```bash
git add docs/data-sources.md src/data src/domain/__tests__/models.test.ts
git commit -m "docs: document data source and license policy"
```

---

### Task 14: Final Verification and Hackathon Handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/demo-script.md`
- Create: `docs/architecture.md`

**Interfaces:**
- Consumes: all previous tasks
- Produces: setup instructions, architecture summary, known limits, and demo checklist

- [ ] **Step 1: Add README quickstart**

Include Node version, `npm install`, `npm run dev`, local app URL, local sync API URL, `npm run test`, `npm run test:e2e`, and Android Chrome testing notes.

- [ ] **Step 2: Add architecture document**

Summarize reusable product capabilities: city packs, source adapters, planner core, explanation engine, AR resolver, sync/safety API, and PWA platform layer.

- [ ] **Step 3: Add known limits**

Record that production API credentials, production persistence, verified accessibility coverage, real notification delivery, and live GTFS refresh are not included in the 24-hour MVP.

- [ ] **Step 4: Run full verification**

Run: `npm run lint`
Run: `npm run test`
Run: `npm run build`
Run: `npm run test:e2e`
Expected: all commands pass.

- [ ] **Step 5: Manual Android QA**

On Android Chrome or a mobile emulator, verify city switching, planning, lock/replace, narration, AR fallback, share link, guardian page, offline last itinerary, denied location permission, and SOS cancel flow.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/architecture.md docs/demo-script.md
git commit -m "docs: add MVP handoff and verification guide"
```

---

## Implementation Order

1. Task 1 creates the buildable base.
2. Tasks 2-4 create the reusable planning kernel.
3. Tasks 5-7 make the traveler-facing Rome and Guiyang MVP usable.
4. Tasks 8-10 add social sharing, guardian progress, and SOS.
5. Tasks 11-14 harden Android PWA behavior and prepare the hackathon handoff.

## Self-Review

- Spec coverage: The plan covers Android PWA, reusable city packs, Rome historical AR, Guiyang accessibility and effort planning, public transit display, explanations, data licensing, offline fallback, sharing, progress sync, SOS, and final demo docs.
- Open-item scan: The plan avoids open-ended filler language and defines concrete files, interfaces, commands, test names, and acceptance expectations.
- Type consistency: `Place`, `Leg`, `Itinerary`, `PlanningConstraints`, `CityPack`, `HeritageAsset`, `ShareSession`, `TripEvent`, `ProgressHeartbeat`, and `EmergencyEvent` are defined once in Task 2 and consumed consistently by later tasks.

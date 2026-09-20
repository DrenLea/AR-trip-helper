import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { Itinerary } from '../../domain/models';
import { getCityPack } from '../../city-packs/registry';
import { mapStyles } from './mapStyles';

export function routeMapPoints(itinerary: Itinerary) {
  try {
    const pack = getCityPack(itinerary.cityId);
    const ids = [...new Set([itinerary.legs[0]?.from, ...itinerary.stops.map(s => s.placeId), itinerary.legs.at(-1)?.to].filter((id): id is string => !!id))];
    return ids.flatMap(id => { const place = pack.places.find(p => p.id === id); return place ? [place] : []; });
  } catch { return []; }
}
export function MapView({ itinerary }: { itinerary: Itinerary }): JSX.Element {
  const [failed, setFailed] = useState(false), ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: LeafletMap | undefined, cancelled = false;
    if (typeof window === 'undefined' || failed) return;
    import('leaflet').then(({ default: L }) => {
      if (cancelled || !ref.current) return;
      try {
        const points = routeMapPoints(itinerary);
        if (!points.length) throw new Error('No mapped places');
        map = L.map(ref.current).setView([points[0].lat, points[0].lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
        points.forEach(place => {
          const label = document.createElement('span');
          label.textContent = place.name;
          L.circleMarker([place.lat, place.lon], { radius: 7, color: '#286655', fillOpacity: .85 }).addTo(map!).bindTooltip(label);
        });
        if (points.length > 1) map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lon])), { padding: [24, 24] });
      } catch { setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; map?.remove(); };
  }, [itinerary, failed]);
  return <section aria-label="Route map" className="map-view">{failed ? <RouteSummary itinerary={itinerary} /> : <div ref={ref} style={mapStyles} role="img" aria-label="Interactive route map" />}<button type="button" onClick={() => setFailed(true)}>Show accessible text route</button></section>;
}
function RouteSummary({ itinerary }: { itinerary: Itinerary }) {
  const points = routeMapPoints(itinerary);
  const name = (id: string) => points.find(p => p.id === id)?.name ?? id;
  return <div className="route-summary"><h3>路线地点与接驳估算</h3><ol>{itinerary.stops.map((stop, index) => <li key={stop.placeId + '-' + index}><strong>{name(stop.placeId)}</strong><span>{stop.arrival} · {stop.kind === 'rest' ? '休息' : stop.kind === 'meal' ? '用餐' : '参观'} · {stop.durationMin} 分钟</span></li>)}</ol><ul>{itinerary.legs.map((leg, index) => <li key={index}>{name(leg.from)} → {name(leg.to)} · {leg.mode === 'walk' ? '步行估算' : '接驳待确认'} · 约 {leg.durationMin} 分钟 · 约 {Math.round(leg.distanceM ?? 0)} 米</li>)}</ul><small>Map data © OpenStreetMap contributors · 地点坐标与步行/接驳均为规划估算</small></div>;
}
export default MapView;

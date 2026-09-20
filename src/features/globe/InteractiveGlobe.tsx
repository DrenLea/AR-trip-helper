import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type { Landmark } from '../discovery/citySearch';

export interface GlobeMarker { id: string; label: string; lat: number; lon: number; tone?: 'gold' | 'coral' | 'teal'; installed?: boolean; landmark?: Landmark }
interface InteractiveGlobeProps { markers: GlobeMarker[]; onSelect?: (marker: GlobeMarker) => void; focus?: { lat: number; lon: number } | null }
const land = feature(world as never, (world as unknown as { objects: { countries: never } }).objects.countries) as never;
export const isMarkerVisible = (marker: { lat: number; lon: number }, center: [number, number]) => geoDistance([marker.lon, marker.lat], center) < Math.PI / 2 - 0.015;

function LandmarkIcon({ kind }: { kind: Landmark }) {
  if (kind === 'eiffel') return <g><path d="M0-38 -3-20 -13 0 -6 0 -3-8 3-8 6 0 13 0 3-20Z" /><path d="M-7-12H7M-4-21H4M0-42V-38" fill="none" stroke="currentColor" strokeWidth="2" /></g>;
  if (kind === 'colosseum') return <g><path d="M-20-24Q0-32 20-24V-3Q0 5-20-3Z"/><path d="M-16-21V-16M-8-23V-18M0-24V-19M8-23V-18M16-21V-16M-16-10V-5M-8-12V-7M0-13V-8M8-12V-7M16-10V-5" stroke="#fafaf6" strokeWidth="3" fill="none"/><path d="M-21-14Q0-21 21-14" fill="none" stroke="#fafaf6" strokeWidth="1.5"/></g>;
  if (kind === 'jiaxiu') return <g><path d="M-17 0H17V-4H-17ZM-11-6H11V-15H-11ZM-8-19H8V-27H-8ZM-18-16Q-8-19 0-24 8-19 18-16ZM-15-28Q-6-30 0-36 6-30 15-28Z"/><path d="M-5-14V-7M5-14V-7M0-36V-40" stroke="#fafaf6" strokeWidth="2"/></g>;
  return <g><path d="M-12 0V-18H-4V-27H5V-13H13V0ZM-2-27V-32"/><path d="M-9-14V-11M-9-7V-4M0-23V-20M0-15V-12M8-9V-6" stroke="#fafaf6" strokeWidth="2"/></g>;
}

export function InteractiveGlobe({ markers, onSelect, focus }: InteractiveGlobeProps): ReactElement {
  const size = 360;
  const radius = 148;
  const gradientId = useId().replaceAll(':', '');
  const [rotation, setRotation] = useState<[number, number, number]>([-12, -18, 0]);
  const rotationRef = useRef(rotation);
  const frame = useRef(0);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number; rotation: [number, number, number]; dragged: boolean; marker?: string } | null>(null);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => {
    if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lon)) return;
    cancelAnimationFrame(frame.current);
    const initial = rotationRef.current;
    const deltaLon = ((-focus.lon - initial[0] + 540) % 360) - 180;
    const targetLat = -focus.lat;
    let start: number | null = null;
    const animate = (now: number) => {
      start ??= now;
      const fraction = Math.min(1, (now - start) / 750);
      const ease = 1 - Math.pow(1 - fraction, 3);
      setRotation([initial[0] + deltaLon * ease, initial[1] + (targetLat - initial[1]) * ease, 0]);
      if (fraction < 1) frame.current = requestAnimationFrame(animate);
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setRotation([-focus.lon, targetLat, 0]);
    else frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [focus?.lat, focus?.lon]);
  const projection = useMemo(() => geoOrthographic().translate([size / 2, size / 2]).scale(radius).rotate(rotation), [rotation]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const center = projection.invert?.([size / 2, size / 2]) ?? [0, 0];
  const visibleMarkers = markers.filter((marker) => isMarkerVisible(marker, center)).map((marker) => {
    const point = projection([marker.lon, marker.lat])!;
    return { ...marker, x: point[0], y: point[1] };
  });
  const select = (marker: GlobeMarker) => { setActiveMarker(marker.id); onSelect?.(marker); };
  const begin = (event: PointerEvent<SVGSVGElement>) => {
    if (pointer.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    cancelAnimationFrame(frame.current);
    const target = event.target as Element;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation, dragged: false, marker: target.closest('[data-marker]')?.getAttribute('data-marker') ?? undefined };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.dragged = true;
    if (!drag.dragged) return;
    setActiveMarker(null);
    const scale = size / Math.max(1, event.currentTarget.getBoundingClientRect().width);
    setRotation([drag.rotation[0] + dx * scale * 0.4, Math.max(-89, Math.min(89, drag.rotation[1] - dy * scale * 0.4)), 0]);
  };
  const end = (event: PointerEvent<SVGSVGElement>) => {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.dragged && event.type !== 'pointercancel') {
      const marker = markers.find((item) => item.id === drag.marker);
      if (marker) select(marker);
    }
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div className="globe-wrap">
    <div className="globe-orbit orbit-one" /><div className="globe-orbit orbit-two" />
    <svg className="interactive-globe" style={{ touchAction: 'none' }} viewBox={`0 0 ${size} ${size}`} role="group" aria-label="可旋转的世界地球仪，拖动旋转，点击地标选择城市" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <defs><radialGradient id={`${gradientId}-ocean`} cx="32%" cy="24%"><stop offset="0%" stopColor="#fafbf9" /><stop offset="70%" stopColor="#e7ebea" /><stop offset="100%" stopColor="#c4cfcc" /></radialGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill={`url(#${gradientId}-ocean)`} stroke="#c7d2cf" />
      <path d={path(geoGraticule10()) ?? ''} fill="none" stroke="#adbcb7" strokeOpacity=".3" strokeWidth=".65" />
      <path d={path(land) ?? ''} fill="#c2ccc6" stroke="#f3f6f1" strokeWidth=".6" />
      {visibleMarkers.map((marker) => {
        const installed = marker.installed ?? (marker.id === 'rome' || marker.id === 'guiyang');
        const selected = activeMarker === marker.id || marker.tone === 'coral';
        const color = selected ? '#d56c52' : installed ? '#237e78' : '#70847d';
        const kind = marker.landmark ?? (marker.id === 'rome' ? 'colosseum' : marker.id === 'guiyang' ? 'jiaxiu' : marker.id === 'paris' ? 'eiffel' : 'city');
        return <g key={marker.id} data-marker={marker.id} className="globe-marker" role="button" tabIndex={0} aria-label={`选择${marker.label}${installed ? '，已安装城市包' : '，在线城市'}`} aria-pressed={selected} transform={`translate(${marker.x},${marker.y})`} style={{ cursor: 'pointer', color }} onPointerEnter={() => { if (!pointer.current) setActiveMarker(marker.id); }} onPointerLeave={(event) => { if (event.pointerType !== 'touch') setActiveMarker(null); }} onFocus={() => setActiveMarker(marker.id)} onBlur={() => setActiveMarker(null)} onKeyDown={(event: KeyboardEvent<SVGGElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(marker); } }}>
          <title>{marker.label} · {installed ? '城市包已安装，可离线使用' : '在线探索，尚无离线城市包'}</title>
          <rect x="-24" y="-44" width="48" height="52" fill="transparent" />
          <ellipse cy="2" rx="16" ry="5" fill={color} opacity=".14" />
          <g fill={color} stroke={color} strokeWidth=".5"><LandmarkIcon kind={kind} /></g>
          <circle cy="3" r="3" fill={installed ? color : '#f7faf7'} stroke={color} strokeWidth="1.6" />
          <text y="19" textAnchor="middle" style={{ fill: '#344e47', fontSize: '10px', fontWeight: 700, paintOrder: 'stroke', stroke: '#fafbf8', strokeWidth: 3 }}>{marker.label}</text>
          {selected && <g role="tooltip"><rect x="-52" y="-64" width="104" height="18" rx="7" fill="#253f38"/><text y="-52" textAnchor="middle" style={{ fill: '#fff', fontSize: '8px' }}>{installed ? '已安装 · 支持离线' : '在线探索 · 尚未安装'}</text></g>}
        </g>;
      })}
    </svg>
    <p className="globe-hint">拖动旋转 · 点击地标探索 · 实心标记为已安装城市</p>
  </div>;
}

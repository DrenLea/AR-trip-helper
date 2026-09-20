import { useMemo, useState } from 'react';
import { getCityPack } from './city-packs/registry';
import { planDay } from './domain/planner/buildItinerary';
import { InteractiveGlobe, type GlobeMarker } from './features/globe/InteractiveGlobe';
import { cityPackStatusLabel, localCityResults, searchCities, CitySearchUnavailableError, type CityPackStatus, type CitySearchResult } from './features/discovery/citySearch';
import { WeatherCard } from './features/weather/WeatherCard';
import MapView from './features/map/MapView';
import { ArPreviewPanel } from './features/ar/ArPreviewPanel';
import { getPaceProfile } from './features/planning/paceProfiles';

type Phase = 'globe' | 'destination' | 'questions' | 'plan';
const statusLabel: Record<CityPackStatus, string> = cityPackStatusLabel;

export default function App(): JSX.Element {
  const [phase, setPhase] = useState<Phase>('globe');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [selected, setSelected] = useState<CitySearchResult | null>(null);
  const [globeFocus, setGlobeFocus] = useState<{ lat: number; lon: number } | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [ageGroup, setAgeGroup] = useState('不透露');
  const [interests, setInterests] = useState<string[]>(['文化']);
  const [pace, setPace] = useState('舒适漫游');

  const selectCity = (city: CitySearchResult) => { setSelected(city); setGlobeFocus({ lat: city.lat, lon: city.lon }); setPhase('destination'); };
  const markers: GlobeMarker[] = (results.length ? results : localCityResults).map((city) => ({ id: city.id, label: city.name, lat: city.lat, lon: city.lon, installed: city.status === 'installed', landmark: city.landmark, tone: city.status === 'installed' ? (city.cityId === 'guiyang' ? 'coral' : 'gold') : 'teal' }));
  const toggleInterest = (interest: string) => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  const pack = selected?.cityId ? getCityPack(selected.cityId) : null;
  const itinerary = useMemo(() => pack ? planDay({ cityPack: pack, date: '2026-10-03', startPlaceId: `${pack.id}-hotel`, endPlaceId: `${pack.id}-hotel`, interests: { history: interests.includes('历史') ? 3 : 1, culture: interests.includes('文化') ? 3 : 1, nature: interests.includes('自然') ? 3 : 1, food: interests.includes('美食') ? 3 : 1 }, constraints: getPaceProfile(pace).constraints }) : null, [pack, interests, pace]);
  const firstPlace = pack?.places.find((place) => place.category === 'sight' || place.category === 'museum') ?? pack?.places[0];

  async function handleSearch() { if (query.trim().length < 2) { setResults([]); setSearchMessage('请输入至少两个字符'); return; } setSearchMessage('正在搜索全球城市…'); try { const found = await searchCities(query); setResults(found); setSearchMessage(found.length ? '' : '没有找到匹配城市，请换一个关键词'); } catch (error) { if (error instanceof CitySearchUnavailableError) { setResults(error.localResults.length ? error.localResults : localCityResults); setSearchMessage('公共搜索暂时不可用，已显示已加载城市'); } else setSearchMessage('搜索暂时不可用'); } }

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">AR TRIP HELPER · 旅行搭子</p><h1>你想去哪里？</h1><p className="lead">先转动地球，再让我们一起把目的地变成一段会回应你的旅程。</p></div><span className="topbar-mark">✦</span></header>
    {phase !== 'plan' && <section className="discovery-shell">
      <InteractiveGlobe markers={markers} focus={globeFocus} onSelect={(marker) => { const city = [...results, ...localCityResults].find((item) => item.id === marker.id); if (city) selectCity(city); }} />
      <div className="search-panel"><label htmlFor="city-search">搜索任何城市</label><form className="search-row" onSubmit={(event) => { event.preventDefault(); void handleSearch(); }}><input id="city-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：罗马、贵阳、京都、巴黎" /><button type="submit">搜索</button></form><small>搜索结果来自公共地理数据；罗马和贵阳有完整数据包，其他城市以灰色标记显示。</small>{searchMessage && <p className="search-message" role="status">{searchMessage}</p>}{results.length > 0 && <div className="search-results">{results.map((city) => <button className="result-card" key={city.id} type="button" onClick={() => selectCity(city)}><span><strong>{city.name}</strong><small>{city.country} · {statusLabel[city.status]}</small></span><span>→</span></button>)}</div>}</div>
    </section>}
    {phase === 'globe' && <section className="intro-note"><span className="note-icon">01</span><div><strong>从一个城市开始</strong><p>拖动地球查看已准备好的目的地，或直接搜索全球城市。</p></div></section>}
    {phase === 'destination' && selected && <section className="flow-card"><button className="back-link" type="button" onClick={() => setPhase('globe')}>← 换一个城市</button><div className="destination-header"><div><p className="eyebrow">DESTINATION FOUND</p><h2>{selected.name}</h2><p>{selected.country} · {statusLabel[selected.status]}</p></div><WeatherCard lat={selected.lat} lon={selected.lon} cityName={selected.name} /></div><div className="destination-actions"><button className="primary-button" type="button" onClick={() => setPhase('questions')}>为我规划这趟旅程</button><button className="secondary-button" type="button" onClick={() => setPhase('plan')}>先在线逛逛</button></div><p className="source-note">城市坐标来自公共地理数据；天气来自 Open-Meteo。内容会标注来源和更新时间。</p></section>}
    {phase === 'questions' && selected && <section className="flow-card questions-card"><button className="back-link" type="button" onClick={() => setPhase('destination')}>← 返回目的地</button><p className="eyebrow">TRAVEL COMPANION SETUP</p><h2>让我更懂你的旅行节奏</h2><p className="muted">只收集帮助规划的信息，年龄可以不透露，也不会据此推断你的体力。</p><div className="question-block"><label htmlFor="age-group">你的年龄段（可选）</label><select id="age-group" value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}><option>不透露</option><option>18–29</option><option>30–49</option><option>50+</option></select></div><div className="question-block"><span>你比较喜欢什么？</span><div className="interest-grid">{['文化', '历史', '美食', '自然'].map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? 'choice active' : 'choice'} onClick={() => toggleInterest(interest)}>{interest}</button>)}</div></div><div className="question-block"><label htmlFor="pace">你想要的节奏</label><select id="pace" value={pace} onChange={(event) => setPace(event.target.value)}><option>舒适漫游</option><option>轻松慢游</option><option>一天多看一些</option></select></div><button className="primary-button wide" type="button" onClick={() => setPhase('plan')}>生成我的旅行草稿 →</button></section>}
    {phase === 'plan' && selected && <section className="plan-shell"><button className="back-link" type="button" onClick={() => setPhase('destination')}>← 返回 {selected.name}</button><div className="plan-header"><div><p className="eyebrow">YOUR LIVING GUIDE</p><h2>{selected.name}，今天这样走</h2><p>{selected.status === 'installed' ? '精选城市包已加载，可离线查看路线。' : '当前为在线探索草稿，完整内容会在数据包准备好后补充。'}</p></div><WeatherCard lat={selected.lat} lon={selected.lon} cityName={selected.name} /></div>{itinerary && pack && firstPlace ? <><div className="effort-summary"><strong>{getPaceProfile(pace).label}</strong><span>{getPaceProfile(pace).description}</span><span>约 {itinerary.totals.steps.toLocaleString()} 步 · 步行 {Math.round(itinerary.totals.walkM / 100) / 10} km · 参观 {itinerary.totals.visitCount ?? itinerary.stops.filter((stop) => ['sight', 'museum', 'park'].includes(stop.kind)).length} 处</span></div><div className="content-grid"><section className="timeline-region"><div className="section-heading"><div><p className="eyebrow">DAY 01 · 个性化路线</p><h2>慢慢走，也不错过重点</h2></div><span className="status-chip">{itinerary.totals.steps.toLocaleString()} 步 · {Math.round(itinerary.totals.walkM / 100) / 10} km</span></div><ol className="timeline">{itinerary.stops.map((stop, index) => { const place = pack.places.find((item) => item.id === stop.placeId); return <li key={`${stop.placeId}-${index}`}><span className="time">{stop.arrival ?? `${9 + index}:00`}</span><div><strong>{place?.name ?? stop.placeId}</strong><p>{stop.kind === 'meal' ? '用餐时间' : stop.kind === 'rest' ? '休息一下' : `${stop.durationMin ?? 30} 分钟 · ${place?.interestTags.slice(0, 2).join(' · ') ?? '城市探索'}`}</p></div></li>; })}</ol></section><MapView itinerary={itinerary} /></div><section className="ar-region"><div><p className="eyebrow">ARRIVAL CONTENT</p><h2>{firstPlace.name} · 实地 AR 导游</h2><ArPreviewPanel place={firstPlace} /></div></section></> : <div className="online-explore"><span className="note-icon">↗</span><div><h3>在线探索模式已开启</h3><p>我们会从公共地图、天气和文化资料生成基础内容。街景、馆藏解说和离线路线将在对应城市包可用后解锁。</p><button className="secondary-button" type="button" onClick={() => setPhase('questions')}>完善偏好，生成草稿</button></div></div>}</section>}
  </main>;
}

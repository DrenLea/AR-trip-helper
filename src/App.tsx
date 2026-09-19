import { useState } from 'react';

const cities = [
  { id: 'rome', name: 'Rome', tag: 'History + AR' },
  { id: 'guiyang', name: 'Guiyang', tag: 'Accessible pacing' },
] as const;

export default function App(): JSX.Element {
  const [city, setCity] = useState<(typeof cities)[number]['id']>('rome');
  const active = cities.find((item) => item.id === city) ?? cities[0];
  const isRome = city === 'rome';
  return (
    <main className="app-shell">
      <header className="topbar"><div><p className="eyebrow">AR TRIP HELPER</p><h1>Plan a day that fits your body and time.</h1></div><button className="quiet-button" type="button">Settings</button></header>
      <nav className="city-tabs" aria-label="City selection">
        {cities.map((item) => <button key={item.id} type="button" role="tab" aria-selected={city === item.id} className={city === item.id ? 'city-tab active' : 'city-tab'} onClick={() => setCity(item.id)}><span>{item.name}</span><small>{item.tag}</small></button>)}
      </nav>
      <section className="constraint-region"><div className="section-heading"><div><p className="eyebrow">TODAY'S PARAMETERS</p><h2>Build your route</h2></div><span className="status-chip">{active.name} pack ready</span></div><div className="form-grid"><label>Date<input type="date" defaultValue="2026-10-03" /></label><label>Daily step limit<input type="number" defaultValue="7000" /></label><label>Longest walk (m)<input type="number" defaultValue="900" /></label><label>Rest cadence<select defaultValue="70"><option value="50">Every 50 min</option><option value="70">Every 70 min</option><option value="90">Every 90 min</option></select></label></div><div className="toggle-row"><label><input type="checkbox" defaultChecked={!isRome} /> Step-free or mobility aid priority</label><button className="primary-button" type="button">Re-plan day</button></div></section>
      <div className="content-grid"><section className="timeline-region"><div className="section-heading"><div><p className="eyebrow">{active.name.toUpperCase()} · OCT 03</p><h2>Suggested itinerary</h2></div><span className="freshness">Updated just now</span></div><ol className="timeline"><li><span className="time">09:30</span><div><strong>{isRome ? 'Colosseum' : 'Jiaxiu Tower'}</strong><p>45 min · cultural anchor</p><span className="pill">{isRome ? 'AR narration' : 'Step-free verified'}</span></div></li><li><span className="time">11:00</span><div><strong>Transit + shaded rest</strong><p>Bus 87 · 12 min · 1 transfer</p><span className="pill transit">Public transit</span></div></li><li><span className="time">12:30</span><div><strong>{isRome ? 'Pantheon' : 'Qianlingshan Park'}</strong><p>60 min · interest match 92%</p><span className="pill caution">Access data: {isRome ? 'unknown' : 'verified'}</span></div></li></ol></section><aside className="map-region" aria-label="Route map"><div className="map-placeholder"><div className="map-grid" /><div className="map-pin pin-one">1</div><div className="map-pin pin-two">2</div><div className="map-pin pin-three">3</div><div className="route-line" /><div className="map-caption"><strong>Route overview</strong><span>3 stops · 5,840 steps · 2.1 km walk</span></div></div></aside></div>
      <section className="lower-grid"><article className="dashboard-panel"><p className="eyebrow">EFFORT DASHBOARD</p><div className="metric-row"><div><strong>5,840</strong><span>steps</span></div><div><strong>2.1 km</strong><span>walking</span></div><div><strong>1</strong><span>transfer</span></div></div><div className="progress-track"><span style={{ width: '74%' }} /></div><p className="muted">74% of your daily step budget · 1 rest break inserted</p></article><article className="explain-panel"><p className="eyebrow">WHY THIS ROUTE</p><h3>Balanced for your constraints</h3><ul><li>Interest match prioritizes {isRome ? 'ancient history' : 'low-slope outdoor spaces'}.</li><li>Transit leg avoids a 1.4 km uphill walk.</li><li>Next refresh checks opening hours before departure.</li></ul><button className="text-button" type="button">Review exclusions →</button></article></section>
      <section className="ar-region" aria-label="AR and content"><div><p className="eyebrow">ARRIVAL CONTENT</p><h2>{isRome ? 'Colosseum narration' : 'Jiaxiu Tower guide'}</h2><p className="muted">Text and audio remain available when WebXR or camera access is unavailable.</p></div><div className="ar-fallback"><strong>{isRome ? '3D preview fallback ready' : 'Step-free content mode ready'}</strong><span>{isRome ? 'Model-viewer / external link' : 'Narration + verified access notes'}</span></div></section>
      <footer className="utility-bar"><button className="utility-button" type="button">Share trip</button><button className="utility-button" type="button">Explain at stop</button><button className="sos-button" type="button">Hold for SOS</button></footer>
    </main>
  );
}

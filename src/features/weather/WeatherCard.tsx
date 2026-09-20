import { useEffect, useState } from 'react';

interface WeatherCardProps { lat: number; lon: number; cityName: string }
interface WeatherData { temperature?: number; wind?: number; weatherCode?: number; source?: string; stale?: boolean }

export function WeatherCard({ lat, lon, cityName }: WeatherCardProps): JSX.Element {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/weather?lat=${lat}&lon=${lon}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('weather unavailable'))).then((data: WeatherData) => { if (active) setWeather(data); }).catch(() => { if (active) setWeather(null); });
    return () => { active = false; };
  }, [lat, lon]);
  return <aside className="weather-card">
    <span className="weather-kicker">当地天气</span>
    <strong>{weather?.temperature !== undefined ? `${Math.round(weather.temperature)}°` : '—'}</strong>
    <span>{cityName} · {weather?.wind !== undefined ? `风速 ${Math.round(weather.wind)} km/h` : '正在同步天气'}</span>
    <small>公共数据 · Open-Meteo{weather?.stale ? ' · 缓存数据' : ''}</small>
  </aside>;
}

import { useState, useEffect } from 'react';
import { fetchWeather, TICKER_CITIES } from '../utils/api';
import { getWeatherInfo } from '../utils/weatherCodes.jsx';

function tempAlert(temp) {
  if (temp >= 38) return 'ALERT';
  if (temp <= 0) return 'UPDATE';
  return 'LIVE DATA';
}
function alertColor(type) {
  if (type === 'ALERT') return '#ffb300';
  if (type === 'UPDATE') return '#5bc4ff';
  return '#44d988';
}

export default function WeatherTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all(
      TICKER_CITIES.map(async (city) => {
        try {
          const w = await fetchWeather(city.lat, city.lon);
          const temp = Math.round(w.current.temperature_2m);
          const type = tempAlert(temp);
          const info = getWeatherInfo(w.current.weather_code);
          return { ...city, temp, type, condition: info.label };
        } catch {
          return null;
        }
      })
    ).then(res => setItems(res.filter(Boolean)));
  }, []);

  if (items.length === 0) return <div className="ticker-bar" />;

  const content = [...items, ...items].map((item, i) => (
    <span key={i} className="ticker-item">
      <span className="ticker-dot" style={{ background: alertColor(item.type) }} />
      <span className="ticker-type" style={{ color: alertColor(item.type) }}>{item.type}:</span>
      <span className="ticker-city"> {item.name.toUpperCase()} {item.temp}°C</span>
      {item.type === 'ALERT' && <span className="ticker-condition"> ({item.condition.toUpperCase()})</span>}
      <span className="ticker-sep">  •  </span>
    </span>
  ));

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {content}
      </div>
    </div>
  );
}

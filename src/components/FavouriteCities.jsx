import { useState, useEffect } from 'react';
import { fetchWeather } from '../utils/api';
import { getWeatherInfo, WeatherIcon } from '../utils/weatherCodes.jsx';

// Individual favourite city card — fetches its own live weather
function FavCard({ fav, onSelect, onRemove }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWeather(fav.lat, fav.lon)
      .then(w => { if (!cancelled) setData(w); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [fav.lat, fav.lon]);

  const cur  = data?.current;
  const temp = cur ? Math.round(cur.temperature_2m) : null;
  const info = cur ? getWeatherInfo(cur.weather_code) : null;
  const wind = cur ? Math.round(cur.wind_speed_10m) : null;
  const hum  = cur ? cur.relative_humidity_2m : null;

  return (
    <div className="fav-card" onClick={() => onSelect(fav)} title={`View ${fav.city}`}>
      <div className="fav-card-header">
        <div className="fav-card-icon">
          {info ? <WeatherIcon type={info.icon} size={28} /> : (
            <div className="fav-card-spinner" />
          )}
        </div>
        <button
          className="fav-card-remove"
          onClick={e => { e.stopPropagation(); onRemove(fav.lat, fav.lon); }}
          title="Remove from favourites"
        >
          ✕
        </button>
      </div>

      <div className="fav-card-temp">
        {temp !== null ? `${temp}°C` : '—'}
      </div>

      <div className="fav-card-city">{fav.city}</div>
      <div className="fav-card-country">{fav.country}</div>

      {info && (
        <div className="fav-card-condition">{info.label}</div>
      )}

      {(wind !== null || hum !== null) && (
        <div className="fav-card-meta">
          {wind !== null && (
            <span className="fav-card-meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
              </svg>
              {wind} km/h
            </span>
          )}
          {hum !== null && (
            <span className="fav-card-meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
              {hum}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function FavouriteCities({ favourites, onSelect, onRemove }) {
  const [open, setOpen] = useState(true);

  if (favourites.length === 0) return null;

  return (
    <div className="fav-section">
      <button className="fav-section-header" onClick={() => setOpen(o => !o)}>
        <span className="fav-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Favourite Cities
          <span className="fav-count">{favourites.length}</span>
        </span>
        <svg
          className={`fav-chevron ${open ? 'open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="fav-grid">
          {favourites.map(fav => (
            <FavCard
              key={`${fav.lat},${fav.lon}`}
              fav={fav}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

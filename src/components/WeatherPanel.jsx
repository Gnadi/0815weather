import { getWeatherInfo, WeatherIcon } from '../utils/weatherCodes.jsx';

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function ForecastBar({ min, max, globalMin, globalMax }) {
  const range = globalMax - globalMin || 1;
  const left  = ((min - globalMin) / range) * 100;
  const width = ((max - min) / range) * 100;
  return (
    <div className="forecast-bar-bg">
      <div className="forecast-bar-fill" style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }} />
    </div>
  );
}

export default function WeatherPanel({ location, weather, loading }) {
  if (loading) {
    return (
      <div className="weather-panel">
        <div className="panel-loading">
          <div className="spinner" />
          <p>Loading weather data…</p>
        </div>
      </div>
    );
  }

  if (!weather || !location) {
    return (
      <div className="weather-panel">
        <div className="panel-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
            <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="2"/>
            <path d="M24 14v10l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <p>Click on the globe to select a location</p>
        </div>
      </div>
    );
  }

  const cur = weather.current;
  const daily = weather.daily;
  const info = getWeatherInfo(cur.weather_code);
  const temp = Math.round(cur.temperature_2m);
  const humidity = cur.relative_humidity_2m;
  const wind = Math.round(cur.wind_speed_10m);
  const pressure = Math.round(cur.surface_pressure);
  const visibility = (cur.visibility / 1000).toFixed(1);

  const allMaxes = daily.temperature_2m_max;
  const allMins  = daily.temperature_2m_min;
  const globalMax = Math.max(...allMaxes);
  const globalMin = Math.min(...allMins);

  // Build warning message from weather code
  let warning = null;
  if (cur.weather_code >= 95) warning = `Thunderstorm warning for ${location.city} area.`;
  else if (cur.weather_code >= 80) warning = `Heavy rain expected in the ${location.city} area.`;
  else if (cur.weather_code >= 71) warning = `Snowfall expected in the ${location.city} area.`;
  else if (temp >= 38) warning = `Extreme heat warning: ${temp}°C in ${location.city}.`;
  else if (temp <= -15) warning = `Extreme cold warning: ${temp}°C in ${location.city}.`;

  // Get day abbreviations for daily forecast
  const today = new Date();
  const forecastDays = daily.time.map((t, i) => {
    const d = new Date(t + 'T00:00:00Z');
    return i === 0 ? 'TODAY' : DAYS[d.getUTCDay()];
  });

  return (
    <div className="weather-panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="panel-city">{location.city}</h2>
          <p className="panel-country">{location.country}</p>
        </div>
        <button className="kebab-btn" aria-label="More options">
          <span /><span /><span />
        </button>
      </div>

      {/* Temperature */}
      <div className="panel-temp-row">
        <div>
          <div className="panel-temp">{temp}°C</div>
          <div className="panel-condition">{info.label.toUpperCase()}</div>
        </div>
        <div className="panel-icon">
          <WeatherIcon type={info.icon} size={72} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M12 17v5M9 21h6"/></svg>}
          label="Humidity"
          value={`${humidity}%`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>}
          label="Wind"
          value={`${wind} km/h`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          label="Pressure"
          value={`${pressure} hPa`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>}
          label="Visibility"
          value={`${visibility} km`}
        />
      </div>

      {/* 5-Day Forecast */}
      <div className="forecast-header">
        <span>5-Day Forecast</span>
        <button className="view-all-btn">VIEW ALL</button>
      </div>
      <div className="forecast-list">
        {forecastDays.map((day, i) => {
          const fc = getWeatherInfo(daily.weather_code[i]);
          const hi = Math.round(allMaxes[i]);
          const lo = Math.round(allMins[i]);
          return (
            <div key={i} className="forecast-row">
              <span className="fc-day">{day}</span>
              <span className="fc-icon"><WeatherIcon type={fc.icon} size={22} /></span>
              <ForecastBar min={lo} max={hi} globalMin={globalMin} globalMax={globalMax} />
              <span className="fc-temps">{hi}° / {lo}°</span>
            </div>
          );
        })}
      </div>

      {/* Warning */}
      {warning && (
        <div className="weather-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60aaff" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <div className="warning-title">Weather Warning</div>
            <div className="warning-text">{warning}</div>
          </div>
        </div>
      )}
    </div>
  );
}

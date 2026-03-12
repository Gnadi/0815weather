// Layer cycle order and display labels
const LAYER_LABELS = {
  plain:    'Plain',
  borders:  'Borders',
  capitals: 'Capitals',
  cities:   'All Cities',
};

const WEATHER_LAYERS = [
  { id: 'temperature', label: 'Temperature', icon: '🌡' },
  { id: 'rain',        label: 'Rain',        icon: '🌧' },
  { id: 'wind',        label: 'Wind',        icon: '💨' },
];

const LEGENDS = {
  temperature: {
    gradient: 'linear-gradient(to right, #7f00ff, #0032ff, #00b4ff, #00dc78, #50dc00, #ffc800, #ff3c00)',
    labels: ['-40°', '0°', '20°', '35°', '40°+'],
    unit: '°C',
    title: 'Temperature',
  },
  rain: {
    gradient: 'linear-gradient(to right, rgba(0,180,255,0.05), rgba(0,180,255,0.55), #003ccc)',
    labels: ['None', '0.1', '5', '10', '15+'],
    unit: 'mm/h',
    title: 'Precipitation',
  },
  wind: {
    gradient: 'linear-gradient(to right, #1e64ff, #00dcc8, #50dc32, #ffc800, #ff3c00)',
    labels: ['0', '20', '40', '60', '80+'],
    unit: 'km/h',
    title: 'Wind Speed',
  },
};

function WeatherLegend({ layer }) {
  const lg = LEGENDS[layer];
  if (!lg) return null;
  return (
    <div className="weather-legend">
      <div className="weather-legend-title">{lg.title} <span className="weather-legend-unit">({lg.unit})</span></div>
      <div className="weather-legend-bar" style={{ background: lg.gradient }} />
      <div className="weather-legend-labels">
        {lg.labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

function WeatherPicker({ weatherLayer, onChange }) {
  return (
    <div className="weather-picker">
      <div className="weather-picker-tabs">
        {WEATHER_LAYERS.map(l => (
          <button
            key={l.id}
            className={`weather-tab${weatherLayer === l.id ? ' active' : ''}`}
            onClick={() => onChange(weatherLayer === l.id ? null : l.id)}
            title={l.label}
          >
            <span className="weather-tab-icon">{l.icon}</span>
            <span className="weather-tab-label">{l.label}</span>
          </button>
        ))}
      </div>
      {weatherLayer && <WeatherLegend layer={weatherLayer} />}
    </div>
  );
}

export default function GlobeControls({
  onZoomIn, onZoomOut, onReset, onToggleLayers, layerMode,
  weatherLayer, onWeatherLayerChange, weatherOpen, onToggleWeatherPanel,
  weatherGridLoading,
}) {
  const isLayerActive    = layerMode !== 'plain';
  const isWeatherActive  = weatherOpen || weatherLayer !== null;
  const layerTitle       = `Layer: ${LAYER_LABELS[layerMode] ?? layerMode} (click to cycle)`;
  const weatherBadge     = weatherLayer
    ? WEATHER_LAYERS.find(l => l.id === weatherLayer)?.label
    : null;

  return (
    <div className="globe-controls-wrapper">
      {weatherOpen && (
        <WeatherPicker weatherLayer={weatherLayer} onChange={onWeatherLayerChange} />
      )}

      <div className="globe-controls">
        <button className="ctrl-btn" onClick={onZoomIn} title="Zoom in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button className="ctrl-btn" onClick={onZoomOut} title="Zoom out">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button className="ctrl-btn ctrl-divider" onClick={onReset} title="Reset rotation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
        <button
          className={`ctrl-btn ctrl-divider ctrl-layers${isLayerActive ? ' ctrl-layers--active' : ''}`}
          onClick={onToggleLayers}
          title={layerTitle}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          {isLayerActive && (
            <span className="ctrl-layer-badge">{LAYER_LABELS[layerMode]}</span>
          )}
        </button>
        <button
          className={`ctrl-btn ctrl-divider ctrl-weather${isWeatherActive ? ' ctrl-weather--active' : ''}`}
          onClick={onToggleWeatherPanel}
          title="Weather overlays"
        >
          {weatherGridLoading ? (
            <svg className="weather-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
          )}
          {!weatherGridLoading && weatherBadge && (
            <span className="ctrl-layer-badge">{weatherBadge}</span>
          )}
        </button>
      </div>
    </div>
  );
}

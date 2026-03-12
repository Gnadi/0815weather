// Layer cycle order and display labels
const LAYER_LABELS = {
  plain:    'Plain',
  borders:  'Borders',
  capitals: 'Capitals',
  cities:   'All Cities',
};

export default function GlobeControls({ onZoomIn, onZoomOut, onReset, onToggleLayers, layerMode, showWeather, onWeatherToggle }) {
  const isLayerActive = layerMode !== 'plain';
  const layerTitle = `Layer: ${LAYER_LABELS[layerMode] ?? layerMode} (click to cycle)`;

  return (
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
        className={`ctrl-btn ctrl-divider${showWeather ? ' ctrl-layers--active' : ''}`}
        onClick={onWeatherToggle}
        title={showWeather ? 'Hide live weather layer' : 'Show live weather (wind, storms, rain)'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
        </svg>
        {showWeather && <span className="ctrl-layer-badge">Live</span>}
      </button>
    </div>
  );
}

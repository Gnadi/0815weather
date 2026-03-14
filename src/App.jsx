import React, { useState, useEffect, useRef, useCallback } from 'react';
import WeatherPanel from './components/WeatherPanel';
import GameMode from './components/GameMode';
import SearchBar from './components/SearchBar';
import DateTime from './components/DateTime';
import WeatherTicker from './components/WeatherTicker';
import GlobeControls from './components/GlobeControls';
import LandingPage from './components/LandingPage';
import { fetchWeather, reverseGeocode, searchCities, TICKER_CITIES } from './utils/api';

const Globe = React.lazy(() => import('./components/Globe'));
import { useFavourites } from './hooks/useFavourites';

const DEFAULT_LOCATION = { lat: 51.5074, lon: -0.1278, city: 'London', country: 'United Kingdom' };

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [location, setLocation]   = useState(DEFAULT_LOCATION);
  const [weather,  setWeather]    = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [tickerCities, setTickerCities] = useState([]);
  const globeRef = useRef(null);

  const { favourites, addFavourite, removeFavourite, isFavourite } = useFavourites();
  const [gameMode, setGameMode]     = useState(false);
  const [gameModeKey, setGameModeKey] = useState(0);

  // Layer toggle: cycles through plain → borders → capitals → cities
  const LAYER_CYCLE = ['plain', 'borders', 'capitals', 'cities'];
  const [layerMode, setLayerMode] = useState('plain');
  function cycleLayer() {
    setLayerMode(cur => {
      const idx = LAYER_CYCLE.indexOf(cur);
      return LAYER_CYCLE[(idx + 1) % LAYER_CYCLE.length];
    });
  }

  // Weather overlay state (independent from layer cycle)
  const [weatherLayer, setWeatherLayer]       = useState(null);  // null | 'temperature' | 'rain' | 'wind'
  const [weatherOpen,  setWeatherOpen]        = useState(false); // picker panel open
  const [weatherGridLoading, setWeatherGridLoading] = useState(false);

  // Load weather for a location
  const loadWeather = useCallback(async (lat, lon, city, country) => {
    setLoading(true);
    try {
      const [weatherData, geoData] = await Promise.all([
        fetchWeather(lat, lon),
        city ? Promise.resolve({ city, country }) : reverseGeocode(lat, lon),
      ]);
      setLocation({ lat, lon, city: geoData.city, country: geoData.country });
      setWeather(weatherData);
    } catch (err) {
      console.error('Failed to load weather:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — also handles ?q=<city> URL param for JSON-LD SearchAction
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      searchCities(query).then(results => {
        if (results.length > 0) {
          const first = results[0];
          setShowLanding(false);
          loadWeather(first.latitude, first.longitude, first.name, first.country);
        } else {
          loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.city, DEFAULT_LOCATION.country);
        }
      }).catch(() => {
        loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.city, DEFAULT_LOCATION.country);
      });
    } else {
      loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.city, DEFAULT_LOCATION.country);
    }
  }, []);

  // Load ticker city temps for globe labels
  useEffect(() => {
    Promise.all(
      TICKER_CITIES.slice(0, 4).map(async (c) => {
        try {
          const w = await fetchWeather(c.lat, c.lon);
          return { ...c, temp: Math.round(w.current.temperature_2m) };
        } catch { return null; }
      })
    ).then(res => setTickerCities(res.filter(Boolean)));
  }, []);

  function onLocationSelect(lat, lon) {
    loadWeather(lat, lon, null, null);
  }

  function onCitySelect(lat, lon, city, country) {
    loadWeather(lat, lon, city, country);
  }

  // When a favourite card is clicked, load that city and fly the globe to it
  function onFavSelect(fav) {
    loadWeather(fav.lat, fav.lon, fav.city, fav.country);
  }

  const cityLabels = [
    ...tickerCities,
    location.city ? { ...location, lat: location.lat, lon: location.lon } : null,
  ].filter(Boolean);

  if (showLanding) {
    return (
      <LandingPage
        onExplore={() => setShowLanding(false)}
        onStartGame={() => { setShowLanding(false); setGameMode(true); }}
      />
    );
  }

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <SearchBar onCitySelect={onCitySelect} />
        <button
          className={`game-mode-btn ${gameMode ? 'active' : ''}`}
          onClick={() => setGameMode(g => !g)}
          title={gameMode ? 'Exit Game Mode' : 'Play Game Mode'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M12 12h.01M8 10v4M6 12h4M16 10v4M14 12h4" />
          </svg>
          {gameMode ? 'EXIT GAME' : 'GAME MODE'}
        </button>
        <DateTime />
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="globe-area">
          <React.Suspense fallback={<div className="globe-mount" style={{ background: 'var(--bg)' }} />}>
            <Globe
              ref={globeRef}
              onLocationSelect={onLocationSelect}
              selectedLocation={location}
              cityLabels={cityLabels}
              layerMode={layerMode}
              weatherLayer={weatherLayer}
              onWeatherLoading={setWeatherGridLoading}
            />
          </React.Suspense>
          <GlobeControls
            onZoomIn={() => globeRef.current?.zoomIn()}
            onZoomOut={() => globeRef.current?.zoomOut()}
            onReset={() => globeRef.current?.reset()}
            onToggleLayers={cycleLayer}
            layerMode={layerMode}
            weatherLayer={weatherLayer}
            onWeatherLayerChange={setWeatherLayer}
            weatherOpen={weatherOpen}
            onToggleWeatherPanel={() => setWeatherOpen(o => !o)}
            weatherGridLoading={weatherGridLoading}
          />
        </div>
        {gameMode ? (
          <GameMode
            key={gameModeKey}
            onExit={() => { setGameMode(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onPlayAgain={() => setGameModeKey(k => k + 1)}
          />
        ) : (
          <WeatherPanel
            location={location}
            weather={weather}
            loading={loading}
            favourites={favourites}
            isFavourite={isFavourite}
            onAddFavourite={addFavourite}
            onRemoveFavourite={removeFavourite}
            onFavSelect={onFavSelect}
          />
        )}
      </main>

      {/* Bottom ticker */}
      <WeatherTicker />
    </div>
  );
}

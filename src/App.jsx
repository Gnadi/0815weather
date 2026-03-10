import { useState, useEffect, useRef, useCallback } from 'react';
import Globe from './components/Globe';
import WeatherPanel from './components/WeatherPanel';
import SearchBar from './components/SearchBar';
import DateTime from './components/DateTime';
import WeatherTicker from './components/WeatherTicker';
import GlobeControls from './components/GlobeControls';
import { fetchWeather, reverseGeocode, TICKER_CITIES } from './utils/api';

const DEFAULT_LOCATION = { lat: 51.5074, lon: -0.1278, city: 'London', country: 'United Kingdom' };

export default function App() {
  const [location, setLocation]   = useState(DEFAULT_LOCATION);
  const [weather,  setWeather]    = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [tickerCities, setTickerCities] = useState([]);
  const globeRef = useRef(null);

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

  // Initial load
  useEffect(() => {
    loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.city, DEFAULT_LOCATION.country);
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

  const cityLabels = [
    ...tickerCities,
    location.city ? { ...location, lat: location.lat, lon: location.lon } : null,
  ].filter(Boolean);

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <SearchBar onCitySelect={onCitySelect} />
        <DateTime />
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="globe-area">
          <Globe
            ref={globeRef}
            onLocationSelect={onLocationSelect}
            selectedLocation={location}
            cityLabels={cityLabels}
          />
          <GlobeControls
            onZoomIn={() => globeRef.current?.zoomIn()}
            onZoomOut={() => globeRef.current?.zoomOut()}
            onReset={() => globeRef.current?.reset()}
            onToggleLayers={() => {}}
          />
        </div>
        <WeatherPanel location={location} weather={weather} loading={loading} />
      </main>

      {/* Bottom ticker */}
      <WeatherTicker />
    </div>
  );
}

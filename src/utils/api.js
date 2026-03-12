export async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,visibility,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto&wind_speed_unit=kmh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Geocode failed');
    const data = await res.json();
    const a = data.address ?? {};
    const city =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? 'Unknown';
    const country = a.country ?? '';
    return { city, country };
  } catch {
    return { city: 'Unknown', country: '' };
  }
}

export async function searchCities(query) {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

// ── Global weather grid (288 points: 24 lons × 12 lats, every 15°) ──────────
export const GRID_LATS = Array.from({ length: 12 }, (_, i) => -82.5 + i * 15);
export const GRID_LONS = Array.from({ length: 24 }, (_, i) => -172.5 + i * 15);

export async function fetchWeatherGrid() {
  const DEG2RAD = Math.PI / 180;
  const points = GRID_LATS.flatMap(lat => GRID_LONS.map(lon => ({ lat, lon })));
  const results = await Promise.all(
    points.map(({ lat, lon }) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation`,
      )
        .then(r => r.json())
        .catch(() => null),
    ),
  );

  // Build 2D arrays [latIdx][lonIdx]
  const nLat = GRID_LATS.length; // 12
  const nLon = GRID_LONS.length; // 24
  const temp  = Array.from({ length: nLat }, () => new Float32Array(nLon));
  const windU = Array.from({ length: nLat }, () => new Float32Array(nLon));
  const windV = Array.from({ length: nLat }, () => new Float32Array(nLon));
  const rain  = Array.from({ length: nLat }, () => new Float32Array(nLon));

  results.forEach((res, idx) => {
    const li = Math.floor(idx / nLon);
    const lo = idx % nLon;
    const cur = res?.current ?? {};
    const t   = cur.temperature_2m ?? 0;
    const spd = cur.wind_speed_10m ?? 0;
    const dir = (cur.wind_direction_10m ?? 0) * DEG2RAD;
    const pr  = cur.precipitation ?? 0;
    temp[li][lo]  = t;
    windU[li][lo] = -spd * Math.sin(dir); // eastward component km/h
    windV[li][lo] = -spd * Math.cos(dir); // northward component km/h
    rain[li][lo]  = pr;
  });

  return { lats: GRID_LATS, lons: GRID_LONS, temp, windU, windV, rain };
}

export const TICKER_CITIES = [
  { name: 'Tokyo',     country: 'Japan',          lat: 35.68,  lon: 139.69 },
  { name: 'Cairo',     country: 'Egypt',           lat: 30.06,  lon: 31.24  },
  { name: 'Reykjavik', country: 'Iceland',         lat: 64.13,  lon: -21.94 },
  { name: 'Sydney',    country: 'Australia',       lat: -33.87, lon: 151.21 },
  { name: 'Paris',     country: 'France',          lat: 48.85,  lon: 2.35   },
  { name: 'New York',  country: 'United States',   lat: 40.71,  lon: -74.01 },
  { name: 'Dubai',     country: 'UAE',             lat: 25.20,  lon: 55.27  },
  { name: 'Beijing',   country: 'China',           lat: 39.90,  lon: 116.39 },
];

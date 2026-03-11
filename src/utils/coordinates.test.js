import { describe, it, expect } from 'vitest';
import { uvToLatLon, latLonToUV, latLonToXYZ, xyzToLatLon } from './coordinates.js';

const EPSILON = 0.0001; // degrees — well below any observable pixel shift

function approx(a, b, tol = EPSILON) {
  return Math.abs(a - b) < tol;
}

// ── uvToLatLon ────────────────────────────────────────────────────
describe('uvToLatLon', () => {
  it('north pole: v=1 → lat=+90', () => {
    const { lat, lon } = uvToLatLon(0.5, 1.0);
    expect(lat).toBe(90);
    expect(lon).toBe(0);
  });

  it('south pole: v=0 → lat=-90', () => {
    const { lat, lon } = uvToLatLon(0.5, 0.0);
    expect(lat).toBe(-90);
    expect(lon).toBe(0);
  });

  it('equator + prime meridian: (0.5, 0.5) → (0°, 0°)', () => {
    const { lat, lon } = uvToLatLon(0.5, 0.5);
    expect(lat).toBe(0);
    expect(lon).toBe(0);
  });

  it('west antimeridian: u=0 → lon=-180°', () => {
    const { lat, lon } = uvToLatLon(0.0, 0.5);
    expect(lat).toBe(0);
    expect(lon).toBe(-180);
  });

  it('east antimeridian: u=1 → lon=+180°', () => {
    const { lat, lon } = uvToLatLon(1.0, 0.5);
    expect(lat).toBe(0);
    expect(lon).toBe(180);
  });

  it('northern hemisphere produces positive latitude', () => {
    // This test would have caught the original bug (90 - uv.y*180)
    const { lat } = uvToLatLon(0.5, 0.8);
    expect(lat).toBeGreaterThan(0);
  });

  it('southern hemisphere produces negative latitude', () => {
    const { lat } = uvToLatLon(0.5, 0.2);
    expect(lat).toBeLessThan(0);
  });
});

// ── latLonToUV ────────────────────────────────────────────────────
describe('latLonToUV', () => {
  it('north pole → v=1', () => {
    const { u, v } = latLonToUV(90, 0);
    expect(v).toBe(1);
    expect(u).toBe(0.5);
  });

  it('south pole → v=0', () => {
    const { u, v } = latLonToUV(-90, 0);
    expect(v).toBe(0);
  });

  it('equator + prime meridian → (0.5, 0.5)', () => {
    const { u, v } = latLonToUV(0, 0);
    expect(u).toBe(0.5);
    expect(v).toBe(0.5);
  });
});

// ── uvToLatLon ↔ latLonToUV round-trip ───────────────────────────
describe('UV round-trip for known capitals', () => {
  const cities = [
    { name: 'London',   lat:  51.5074, lon:  -0.1278 },
    { name: 'Vienna',   lat:  48.2082, lon:  16.3738 },
    { name: 'Sydney',   lat: -33.8688, lon: 151.2093 },
    { name: 'Tokyo',    lat:  35.6762, lon: 139.6503 },
    { name: 'New York', lat:  40.7128, lon: -74.0060 },
    { name: 'Nairobi',  lat:  -1.2921, lon:  36.8219 },
    { name: 'Rio',      lat: -22.9068, lon: -43.1729 },
    { name: 'Moscow',   lat:  55.7558, lon:  37.6173 },
  ];

  cities.forEach(({ name, lat, lon }) => {
    it(`${name} (${lat}°, ${lon}°) survives UV round-trip`, () => {
      const { u, v } = latLonToUV(lat, lon);
      const result   = uvToLatLon(u, v);
      expect(approx(result.lat, lat)).toBe(true);
      expect(approx(result.lon, lon)).toBe(true);
    });
  });
});

// ── latLonToXYZ ↔ xyzToLatLon round-trip ─────────────────────────
describe('XYZ round-trip for known cities', () => {
  const cities = [
    { name: 'London',        lat:  51.5074, lon:  -0.1278 },
    { name: 'Vienna',        lat:  48.2082, lon:  16.3738 },
    { name: 'Sydney',        lat: -33.8688, lon: 151.2093 },
    { name: 'Tokyo',         lat:  35.6762, lon: 139.6503 },
    { name: 'New York',      lat:  40.7128, lon: -74.0060 },
    { name: 'Nairobi',       lat:  -1.2921, lon:  36.8219 },
    { name: 'Rio',           lat: -22.9068, lon: -43.1729 },
    { name: 'Moscow',        lat:  55.7558, lon:  37.6173 },
    { name: 'Buenos Aires',  lat: -34.6037, lon: -58.3816 },
    { name: 'Beijing',       lat:  39.9042, lon: 116.4074 },
  ];

  cities.forEach(({ name, lat, lon }) => {
    it(`${name} (${lat}°, ${lon}°) survives XYZ round-trip`, () => {
      const { x, y, z } = latLonToXYZ(lat, lon, 2);
      const result       = xyzToLatLon(x, y, z);
      expect(approx(result.lat, lat)).toBe(true);
      expect(approx(result.lon, lon)).toBe(true);
    });
  });
});

// ── Consistency: UV path === XYZ path ─────────────────────────────
describe('UV path matches XYZ path (both must agree)', () => {
  const cases = [
    { lat:  51.5074, lon:  -0.1278 },  // London
    { lat:  48.2082, lon:  16.3738 },  // Vienna
    { lat: -33.8688, lon: 151.2093 },  // Sydney
    { lat:  35.6762, lon: 139.6503 },  // Tokyo
    { lat:   0,      lon:   0      },  // null island
    { lat: -22.9068, lon: -43.1729 },  // Rio
  ];

  cases.forEach(({ lat, lon }) => {
    it(`lat=${lat} lon=${lon}: uvToLatLon(latLonToUV) ≈ xyzToLatLon(latLonToXYZ)`, () => {
      const uv  = latLonToUV(lat, lon);
      const uvResult = uvToLatLon(uv.u, uv.v);

      const xyz = latLonToXYZ(lat, lon, 1);
      const xyzResult = xyzToLatLon(xyz.x, xyz.y, xyz.z);

      expect(approx(uvResult.lat,  xyzResult.lat)).toBe(true);
      expect(approx(uvResult.lon,  xyzResult.lon)).toBe(true);
    });
  });
});

// ── Edge cases ────────────────────────────────────────────────────
describe('edge cases', () => {
  it('north pole XYZ round-trip gives lat=+90', () => {
    const { x, y, z } = latLonToXYZ(90, 0, 1);
    const { lat } = xyzToLatLon(x, y, z);
    expect(approx(lat, 90)).toBe(true);
  });

  it('south pole XYZ round-trip gives lat=-90', () => {
    const { x, y, z } = latLonToXYZ(-90, 0, 1);
    const { lat } = xyzToLatLon(x, y, z);
    expect(approx(lat, -90)).toBe(true);
  });

  it('prime meridian: lon=0 preserved', () => {
    const { x, y, z } = latLonToXYZ(0, 0, 1);
    const { lon } = xyzToLatLon(x, y, z);
    expect(approx(lon, 0)).toBe(true);
  });

  it('lon=90 preserved', () => {
    const { x, y, z } = latLonToXYZ(0, 90, 1);
    const { lon } = xyzToLatLon(x, y, z);
    expect(approx(lon, 90)).toBe(true);
  });

  it('lon=-90 preserved', () => {
    const { x, y, z } = latLonToXYZ(0, -90, 1);
    const { lon } = xyzToLatLon(x, y, z);
    expect(approx(lon, -90)).toBe(true);
  });

  it('radius is preserved in magnitude of XYZ result', () => {
    const r = 2;
    const { x, y, z } = latLonToXYZ(45, 90, r);
    const len = Math.sqrt(x * x + y * y + z * z);
    expect(approx(len, r, 1e-10)).toBe(true);
  });
});

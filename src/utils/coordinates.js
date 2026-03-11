/**
 * Pure coordinate math — no Three.js dependency, fully unit-testable.
 *
 * Globe convention (matches Three.js SphereGeometry):
 *   x = -sin(phi) * cos(theta)
 *   y =  cos(phi)                  ← y is "up", north pole = (0,1,0)
 *   z =  sin(phi) * sin(theta)
 *
 * where phi   = (90 - lat)  * DEG2RAD   (colatitude, 0 = north pole)
 *       theta = (lon + 180) * DEG2RAD   (azimuth,   0 = -180° meridian)
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ── UV ↔ lat/lon ──────────────────────────────────────────────────
// Three.js SphereGeometry UV convention:
//   u=0 → lon=-180°, u=1 → lon=+180°
//   v=0 → lat=-90°  (south pole),  v=1 → lat=+90° (north pole)
//
// Source: SphereGeometry sets uv.y = 1 - v_internal where v_internal
// goes 0 (north) → 1 (south), so uv.y=1 is the north pole.

export function uvToLatLon(u, v) {
  return {
    lat: v * 180 - 90,
    lon: u * 360 - 180,
  };
}

export function latLonToUV(lat, lon) {
  return {
    u: (lon + 180) / 360,
    v: (lat + 90)  / 180,
  };
}

// ── lat/lon ↔ XYZ ─────────────────────────────────────────────────

export function latLonToXYZ(lat, lon, radius = 1) {
  const phi   = (90 - lat) * DEG2RAD;
  const theta = (lon + 180) * DEG2RAD;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y:  radius * Math.cos(phi),
    z:  radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function xyzToLatLon(x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z);
  const nx = x / len, ny = y / len, nz = z / len;
  const lat = Math.asin(Math.max(-1, Math.min(1, ny))) * RAD2DEG;
  let   lon = Math.atan2(nz, -nx) * RAD2DEG - 180;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

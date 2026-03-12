// weatherOverlay.js — helpers for the global weather layer
// Bilinear interpolation, color scales, canvas texture builders

// ── Bilinear interpolation ────────────────────────────────────────────────────
// grid: { lats[], lons[], <field>[][] }
// Returns interpolated scalar value for any lat/lon
export function bilinearInterpolate(grid, lat, lon, field) {
  const { lats, lons } = grid;
  const data = grid[field];
  const nLat = lats.length;
  const nLon = lons.length;

  // Clamp latitude
  const clampedLat = Math.max(lats[0], Math.min(lats[nLat - 1], lat));
  // Wrap longitude into grid range
  const minLon = lons[0];
  const maxLon = lons[nLon - 1];
  const span   = maxLon - minLon;
  let wrappedLon = ((lon - minLon) % span + span) % span + minLon;

  // Find surrounding lat indices
  let li = 0;
  while (li < nLat - 2 && lats[li + 1] < clampedLat) li++;
  const t = (clampedLat - lats[li]) / (lats[li + 1] - lats[li]);

  // Find surrounding lon indices
  let lo = 0;
  while (lo < nLon - 2 && lons[lo + 1] < wrappedLon) lo++;
  const s = (wrappedLon - lons[lo]) / (lons[lo + 1] - lons[lo]);

  const lo1 = (lo + 1) % nLon;

  // Bilinear blend
  const v00 = data[li][lo];
  const v01 = data[li][lo1];
  const v10 = data[li + 1][lo];
  const v11 = data[li + 1][lo1];

  return (v00 * (1 - s) + v01 * s) * (1 - t) + (v10 * (1 - s) + v11 * s) * t;
}

// ── Temperature color scale ───────────────────────────────────────────────────
// Maps Celsius to [r, g, b] — matches cambecc/earth palette
const TEMP_STOPS = [
  [-40, [127,   0, 255]],  // purple
  [-20, [  0,  50, 255]],  // deep blue
  [  0, [  0, 180, 255]],  // cyan
  [ 10, [  0, 220, 120]],  // green-cyan
  [ 20, [ 80, 220,   0]],  // yellow-green
  [ 30, [255, 200,   0]],  // yellow
  [ 40, [255,  60,   0]],  // orange-red
];

export function tempToColor(celsius) {
  const stops = TEMP_STOPS;
  if (celsius <= stops[0][0]) return stops[0][1].slice();
  if (celsius >= stops[stops.length - 1][0]) return stops[stops.length - 1][1].slice();
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (celsius <= t1) {
      const f = (celsius - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return stops[stops.length - 1][1].slice();
}

// ── Rain color scale ──────────────────────────────────────────────────────────
// Returns [r, g, b, a] — transparent when no rain
export function rainToColor(mmh) {
  if (mmh < 0.1) return [0, 0, 0, 0];
  // light rain → cyan; heavy rain → deep blue
  const intensity = Math.min(mmh / 15, 1); // 0–1 over range 0–15 mm/h
  const r = Math.round(0   + intensity * 10);
  const g = Math.round(180 - intensity * 130);
  const b = Math.round(220 - intensity * 20);
  const a = Math.round(80  + intensity * 130);  // 80–210 opacity
  return [r, g, b, a];
}

// ── Wind speed color ──────────────────────────────────────────────────────────
// Maps km/h to [r, g, b]
const WIND_STOPS = [
  [ 0, [  30, 100, 255]],  // calm: blue
  [20, [  0, 220, 200]],   // light: cyan
  [40, [ 80, 220,  50]],   // moderate: green
  [60, [255, 220,   0]],   // strong: yellow
  [90, [255,  60,   0]],   // very strong: red
];

export function windSpeedToColor(kmh) {
  const stops = WIND_STOPS;
  if (kmh <= stops[0][0]) return stops[0][1].slice();
  if (kmh >= stops[stops.length - 1][0]) return stops[stops.length - 1][1].slice();
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (kmh <= s1) {
      const f = (kmh - s0) / (s1 - s0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return stops[stops.length - 1][1].slice();
}

// ── Canvas builders ───────────────────────────────────────────────────────────

// Paints a 360×180 canvas with temperature heatmap (bilinearly interpolated)
export function buildTemperatureCanvas(grid, canvas) {
  const W = canvas.width;   // 360
  const H = canvas.height;  // 180
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(W, H);
  const data = img.data;

  for (let py = 0; py < H; py++) {
    const lat = 90 - (py / H) * 180;  // v=0 → lat=+90, v=1 → lat=-90
    for (let px = 0; px < W; px++) {
      const lon = (px / W) * 360 - 180;
      const t = bilinearInterpolate(grid, lat, lon, 'temp');
      const [r, g, b] = tempToColor(t);
      const idx = (py * W + px) * 4;
      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 180;  // ~70% opacity — Earth texture still visible
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Paints a 360×180 canvas with rain intensity (transparent where no rain)
export function buildRainCanvas(grid, canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(W, H);
  const data = img.data;

  for (let py = 0; py < H; py++) {
    const lat = 90 - (py / H) * 180;
    for (let px = 0; px < W; px++) {
      const lon = (px / W) * 360 - 180;
      const pr = bilinearInterpolate(grid, lat, lon, 'rain');
      const [r, g, b, a] = rainToColor(pr);
      const idx = (py * W + px) * 4;
      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

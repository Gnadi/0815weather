import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { CAPITALS, BIG_CITIES } from '../data/geoData';
import { uvToLatLon, latLonToXYZ } from '../utils/coordinates';
import { fetchWeatherGrid } from '../utils/api';
import {
  bilinearInterpolate,
  buildTemperatureCanvas,
  buildRainCanvas,
  windSpeedToColor,
} from '../utils/weatherOverlay';

const EARTH_RADIUS   = 2;
const EARTH_TEXTURE  = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP     = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const BORDERS_URL    = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

// Zoom thresholds (camera.position.z — smaller = more zoomed in)
const BIG_CITY_ZOOM_THRESHOLD = 4.2;   // show big cities below this
const FULL_CAP_ZOOM_THRESHOLD = 5.8;   // show all capitals below this

// Detect mobile once — used for quality scaling
const IS_MOBILE = typeof window !== 'undefined' &&
  (window.innerWidth <= 768 || navigator.maxTouchPoints > 0);

// ── Weather overlay constants ─────────────────────────────────────────────────
const N_PARTICLES     = IS_MOBILE ? 2000 : 6000;
const MAX_PARTICLE_AGE = 1800;  // frames before respawn
const PARTICLE_SPEED  = 0.00008; // scale factor for wind → angle per frame
const OVERLAY_TEX_W   = 360;
const OVERLAY_TEX_H   = 180;
const DEG2RAD         = Math.PI / 180;

// Reusable Three.js objects — allocated once, never in hot path
const _v3a  = new THREE.Vector3();
const _v3b  = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();

// Lat/lon → 3D point on sphere surface (thin Three.js wrapper around pure latLonToXYZ)
function latLonToVec3(lat, lon, radius, out = _v3a) {
  const { x, y, z } = latLonToXYZ(lat, lon, radius);
  out.set(x, y, z);
  return out;
}

// Raycaster hit → lat/lon
function vec3ToLatLon(point, radius) {
  const n = point.clone().normalize();
  const lat = Math.asin(n.y) * (180 / Math.PI);
  const lon = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

// Build LineSegments geometry from GeoJSON (run once when borders layer first activated)
function buildBorderGeometry(geojson) {
  const positions = [];
  function addRing(coords) {
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      const p1 = latLonToVec3(lat1, lon1, EARTH_RADIUS * 1.001, new THREE.Vector3());
      const p2 = latLonToVec3(lat2, lon2, EARTH_RADIUS * 1.001, new THREE.Vector3());
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  geojson.features.forEach(f => {
    const g = f.geometry;
    if (!g) return;
    if (g.type === 'Polygon')      g.coordinates.forEach(addRing);
    if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(addRing));
  });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

// ── Canvas label rendering ────────────────────────────────────────
// Called each frame from the main RAF loop — no DOM mutations at all.
function drawLayerLabels(ctx, canvas, globe, camera, layerMode, cameraZ) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  if (layerMode === 'plain' || layerMode === 'borders' || !W || !H) return;

  // Compute globe-local camera direction once per frame
  _mat4.copy(globe.matrixWorld).invert();
  _v3b.copy(camera.position).applyMatrix4(_mat4).normalize();
  const cx = _v3b.x, cy = _v3b.y, cz = _v3b.z;

  const globeMatrix = globe.matrixWorld;
  const R = EARTH_RADIUS * 1.04;  // label elevation

  const showAllCaps   = cameraZ < FULL_CAP_ZOOM_THRESHOLD;
  const showBigCities = layerMode === 'cities' && cameraZ < BIG_CITY_ZOOM_THRESHOLD;

  // Draw capitals
  ctx.font = `600 ${IS_MOBILE ? 9 : 10}px -apple-system,BlinkMacSystemFont,system-ui,sans-serif`;
  const capsToRender = showAllCaps ? CAPITALS : CAPITALS.slice(0, 50);
  for (let i = 0; i < capsToRender.length; i++) {
    _drawCity(ctx, W, H, capsToRender[i], cx, cy, cz, R, globeMatrix, camera, false);
  }

  // Draw big cities (only when zoomed in enough)
  if (showBigCities) {
    ctx.font = `600 ${IS_MOBILE ? 8 : 9}px -apple-system,BlinkMacSystemFont,system-ui,sans-serif`;
    for (let i = 0; i < BIG_CITIES.length; i++) {
      _drawCity(ctx, W, H, BIG_CITIES[i], cx, cy, cz, R, globeMatrix, camera, true);
    }
  }

  ctx.globalAlpha = 1;
}

function _drawCity(ctx, W, H, city, cx, cy, cz, R, globeMatrix, camera, isBigCity) {
  // Dot product with camera-facing direction (pre-computed nx/ny/nz in geoData)
  const dot = city.nx * cx + city.ny * cy + city.nz * cz;
  if (dot < 0.08) return;  // back-face or near-horizon → skip

  // Smooth fade at the horizon rim
  const alpha = Math.min(1, (dot - 0.08) / 0.18);

  // World position (reuse _v3a)
  _v3a.set(city.nx * R, city.ny * R, city.nz * R).applyMatrix4(globeMatrix);

  // Project to NDC then to pixel coords
  _v3a.project(camera);
  const px = (_v3a.x * 0.5 + 0.5) * W;
  const py = (1 - (_v3a.y * 0.5 + 0.5)) * H;

  // Viewport cull — skip anything not on screen
  if (px < -30 || px > W + 30 || py < -20 || py > H + 20) return;

  ctx.globalAlpha = alpha;

  // Dot marker
  const dotR = isBigCity ? 2 : 2.5;
  ctx.beginPath();
  ctx.arc(px, py, dotR, 0, Math.PI * 2);
  ctx.fillStyle = isBigCity ? 'rgba(200,220,255,0.8)' : '#ffcc44';
  ctx.fill();

  // Text — one stroke pass (shadow) + one fill pass
  const tx = px + dotR + 3;
  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(city.name, tx, py);
  ctx.fillStyle = isBigCity ? 'rgba(220,235,255,0.9)' : '#ffe87a';
  ctx.fillText(city.name, tx, py);
}

// ─────────────────────────────────────────────────────────────────
const Globe = forwardRef(function Globe(
  { onLocationSelect, selectedLocation, cityLabels, layerMode, weatherLayer, onWeatherLoading },
  ref,
) {
  const mountRef    = useRef(null);
  const cameraRef   = useRef(null);
  const globeRef    = useRef(null);
  const rendererRef = useRef(null);
  const frameRef    = useRef(null);

  // Refs that the RAF loop reads without triggering re-renders
  const layerModeRef     = useRef(layerMode);
  const weatherLayerRef  = useRef(weatherLayer);
  const labelCanvasRef   = useRef(null);
  const labelCtxRef      = useRef(null);

  // Borders state
  const borderLinesRef   = useRef(null);
  const borderLoadingRef = useRef(false);

  // Weather overlay state
  const weatherOverlayRef    = useRef(null);   // THREE.Mesh (temp sphere)
  const weatherTexRef        = useRef(null);   // THREE.CanvasTexture (temp)
  const weatherTexCanvasRef  = useRef(null);   // off-screen canvas (temp)
  const rainOverlayRef       = useRef(null);   // THREE.Mesh (rain sphere)
  const rainTexRef           = useRef(null);   // THREE.CanvasTexture (rain)
  const rainTexCanvasRef     = useRef(null);   // off-screen canvas (rain)
  const windParticlesMeshRef = useRef(null);   // THREE.Points
  const windParticleDataRef  = useRef(null);   // {lat,lon,age}[] flat storage
  const weatherGridRef       = useRef(null);   // fetched grid data
  const weatherFetchedAtRef  = useRef(0);      // timestamp for 30-min refresh

  // Keep layerModeRef in sync with prop
  useEffect(() => { layerModeRef.current = layerMode; }, [layerMode]);
  useEffect(() => { weatherLayerRef.current = weatherLayer; }, [weatherLayer]);

  useImperativeHandle(ref, () => ({
    zoomIn()  { if (cameraRef.current) cameraRef.current.position.z = Math.max(cameraRef.current.position.z - 0.5, 2.5); },
    zoomOut() { if (cameraRef.current) cameraRef.current.position.z = Math.min(cameraRef.current.position.z + 0.5, 9); },
    reset()   {
      if (globeRef.current)  globeRef.current.rotation.set(0, 0, 0);
      if (cameraRef.current) cameraRef.current.position.set(0, 0, 5);
    },
  }));

  // ── Main Three.js setup (runs once) ──────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer — on mobile limit pixel ratio to preserve GPU bandwidth
    const renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true });
    renderer.setPixelRatio(IS_MOBILE ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const back = new THREE.DirectionalLight(0x2244aa, 0.3);
    back.position.set(-5, -2, -5);
    scene.add(back);

    // Stars — fewer on mobile
    const starCount = IS_MOBILE ? 1000 : 2000;
    const starVerts = new Float32Array(starCount * 3);
    for (let i = 0; i < starVerts.length; i++) starVerts[i] = (Math.random() - 0.5) * 200;
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 })));

    // Earth — lower geometry on mobile to save GPU
    const segments = IS_MOBILE ? 64 : 96;
    const loader   = new THREE.TextureLoader();
    const mapTex   = loader.load(EARTH_TEXTURE);
    const bumpTex  = loader.load(EARTH_BUMP);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    mapTex.anisotropy = bumpTex.anisotropy = maxAniso;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, segments, segments),
      new THREE.MeshPhongMaterial({ map: mapTex, bumpMap: bumpTex, bumpScale: 0.05, specular: new THREE.Color(0x224466), shininess: 15 }),
    );
    scene.add(globe);
    globeRef.current = globe;

    // ── Weather overlays (temperature + rain textures) ───────────────
    function makeOverlayCanvas() {
      const c = document.createElement('canvas');
      c.width  = OVERLAY_TEX_W;
      c.height = OVERLAY_TEX_H;
      return c;
    }

    // Temperature overlay
    const tempCanvas = makeOverlayCanvas();
    const tempTex    = new THREE.CanvasTexture(tempCanvas);
    const tempMesh   = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.002, 96, 96),
      new THREE.MeshBasicMaterial({ map: tempTex, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    tempMesh.visible = false;
    globe.add(tempMesh);
    weatherOverlayRef.current   = tempMesh;
    weatherTexRef.current       = tempTex;
    weatherTexCanvasRef.current = tempCanvas;

    // Rain overlay (slightly above temperature layer)
    const rainCanvas = makeOverlayCanvas();
    const rainTex    = new THREE.CanvasTexture(rainCanvas);
    const rainMesh   = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.003, 96, 96),
      new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    rainMesh.visible = false;
    globe.add(rainMesh);
    rainOverlayRef.current   = rainMesh;
    rainTexRef.current       = rainTex;
    rainTexCanvasRef.current = rainCanvas;

    // ── Wind particles ────────────────────────────────────────────────
    const posArr    = new Float32Array(N_PARTICLES * 3);
    const colorArr  = new Float32Array(N_PARTICLES * 3);
    const partGeo   = new THREE.BufferGeometry();
    const posAttr   = new THREE.BufferAttribute(posArr,   3);
    const colorAttr = new THREE.BufferAttribute(colorArr, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    partGeo.setAttribute('position', posAttr);
    partGeo.setAttribute('color',    colorAttr);
    const partMesh = new THREE.Points(
      partGeo,
      new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.85 }),
    );
    partMesh.visible = false;
    globe.add(partMesh);
    windParticlesMeshRef.current = partMesh;

    // Particle data: lat, lon, age per particle (flat arrays for speed)
    const pLat = new Float32Array(N_PARTICLES);
    const pLon = new Float32Array(N_PARTICLES);
    const pAge = new Uint16Array(N_PARTICLES);
    for (let i = 0; i < N_PARTICLES; i++) {
      pLat[i] = (Math.random() - 0.5) * 160;   // -80 to +80
      pLon[i] = (Math.random() - 0.5) * 360;   // -180 to +180
      pAge[i] = Math.floor(Math.random() * MAX_PARTICLE_AGE);
    }
    windParticleDataRef.current = { pLat, pLon, pAge };

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x1166aa, transparent: true, opacity: 0.08, side: THREE.BackSide }),
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x2288ff, transparent: true, opacity: 0.04, side: THREE.BackSide }),
    ));

    // ── 2D label canvas overlay ─────────────────────────────────
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width  = W;
    labelCanvas.height = H;
    labelCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    mount.appendChild(labelCanvas);
    labelCanvasRef.current = labelCanvas;
    labelCtxRef.current    = labelCanvas.getContext('2d');
    // Enable sub-pixel text for quality
    labelCtxRef.current.imageSmoothingEnabled = true;

    // ── Interaction state ───────────────────────────────────────
    let mouseDown = false;
    let isDragging = false;
    let lastMouse = { x: 0, y: 0 };
    let rotVel = { x: 0, y: 0 };

    function onMouseDown(e) {
      mouseDown  = true;
      isDragging = false;
      lastMouse  = { x: e.clientX, y: e.clientY };
      rotVel     = { x: 0, y: 0 };
    }
    function onMouseMove(e) {
      if (!mouseDown) return;
      const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
      globe.rotation.y += dx * 0.003;
      globe.rotation.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
      rotVel = { x: dy * 0.001, y: dx * 0.001 };
      lastMouse = { x: e.clientX, y: e.clientY };
    }
    function onMouseUp(e) {
      mouseDown = false;
      if (!isDragging) handleClick(e);
    }

    let lastPinchDist = null;
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        mouseDown = false;
        return;
      }
      const t = e.touches[0];
      mouseDown = true; isDragging = false;
      lastMouse = { x: t.clientX, y: t.clientY };
      rotVel = { x: 0, y: 0 };
    }
    function onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastPinchDist !== null) camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + (lastPinchDist - d) * 0.02));
        lastPinchDist = d;
        return;
      }
      lastPinchDist = null;
      if (!mouseDown) return;
      const t = e.touches[0];
      const dx = t.clientX - lastMouse.x, dy = t.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging = true;
      globe.rotation.y += dx * 0.003;
      globe.rotation.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
      rotVel = { x: dy * 0.001, y: dx * 0.001 };
      lastMouse = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      lastPinchDist = null;
      mouseDown = false;
      if (!isDragging && e.changedTouches.length > 0) handleClick(e.changedTouches[0]);
    }
    function onWheel(e) {
      e.preventDefault();
      camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + e.deltaY * 0.005));
    }
    function handleClick(e) {
      const rect = mount.getBoundingClientRect();
      const x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObject(globe, false);
      // Use UV coordinates from the sphere geometry — direct, no matrix inversion needed.
      // Three.js SphereGeometry UV convention: u=0→lon -180°, u=1→lon +180°; v=0→lat -90° (south pole), v=1→lat +90° (north pole)
      if (hits.length > 0 && hits[0].uv) {
        const lat = hits[0].uv.y * 180 - 90;
        const lon = hits[0].uv.x * 360 - 180;
        onLocationSelect(lat, lon);
      }
    }

    mount.addEventListener('mousedown',  onMouseDown);
    mount.addEventListener('mousemove',  onMouseMove);
    mount.addEventListener('mouseup',    onMouseUp);
    mount.addEventListener('touchstart', onTouchStart, { passive: false });
    mount.addEventListener('touchmove',  onTouchMove,  { passive: false });
    mount.addEventListener('touchend',   onTouchEnd,   { passive: true });
    mount.addEventListener('wheel',      onWheel,      { passive: false });

    // ── Wind particle updater (called from RAF loop) ─────────────────
    function _updateWindParticles(grid) {
      const pd      = windParticleDataRef.current;
      const mesh    = windParticlesMeshRef.current;
      if (!pd || !mesh) return;
      const { pLat, pLon, pAge } = pd;
      const posAttr   = mesh.geometry.attributes.position;
      const colorAttr = mesh.geometry.attributes.color;
      const pos   = posAttr.array;
      const col   = colorAttr.array;
      const R     = EARTH_RADIUS * 1.004;  // slightly above globe surface

      for (let i = 0; i < N_PARTICLES; i++) {
        let lat = pLat[i];
        let lon = pLon[i];
        const age = pAge[i];

        // Respawn if too old or out of bounds
        if (age >= MAX_PARTICLE_AGE || Math.abs(lat) > 85) {
          pLat[i] = (Math.random() - 0.5) * 160;
          pLon[i] = (Math.random() - 0.5) * 360;
          pAge[i] = 0;
          lat = pLat[i]; lon = pLon[i];
        }

        // Interpolate wind at this position
        const u = bilinearInterpolate(grid, lat, lon, 'windU');  // km/h east
        const v = bilinearInterpolate(grid, lat, lon, 'windV');  // km/h north
        const speed = Math.sqrt(u * u + v * v);

        // Advance position (convert km/h to degrees per frame)
        const cosLat = Math.cos(lat * DEG2RAD) || 0.001;
        pLat[i] += v * PARTICLE_SPEED;
        pLon[i] += (u / cosLat) * PARTICLE_SPEED;
        // Wrap longitude
        if (pLon[i] > 180)  pLon[i] -= 360;
        if (pLon[i] < -180) pLon[i] += 360;
        pAge[i] = age + 1;

        // Convert lat/lon to 3D (globe-local coords — globe child, so no world transform needed)
        const phi   = (90 - lat) * DEG2RAD;
        const theta = (lon + 180) * DEG2RAD;
        pos[i * 3]     = -R * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] =  R * Math.cos(phi);
        pos[i * 3 + 2] =  R * Math.sin(phi) * Math.sin(theta);

        // Color by wind speed
        const [r, g, b] = windSpeedToColor(speed);
        col[i * 3]     = r / 255;
        col[i * 3 + 1] = g / 255;
        col[i * 3 + 2] = b / 255;
      }
      posAttr.needsUpdate   = true;
      colorAttr.needsUpdate = true;
    }

    // ── Main animation loop ─────────────────────────────────────
    // On mobile: throttle label canvas redraws to every 2nd frame
    let frameCount = 0;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      globe.rotation.y += rotVel.y;
      globe.rotation.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + rotVel.x));
      rotVel.x *= 0.92;
      rotVel.y *= 0.92;
      renderer.render(scene, camera);

      // Draw 2D label canvas — throttled on mobile for perf
      frameCount++;
      const ctx    = labelCtxRef.current;
      const canvas = labelCanvasRef.current;
      if (ctx && canvas && (!IS_MOBILE || frameCount % 2 === 0)) {
        drawLayerLabels(ctx, canvas, globe, camera, layerModeRef.current, camera.position.z);
      }

      // Animate wind particles
      if (weatherLayerRef.current === 'wind' && weatherGridRef.current) {
        _updateWindParticles(weatherGridRef.current);
      }
    }
    animate();

    // ── Resize ──────────────────────────────────────────────────
    function onResize() {
      const W = mount.clientWidth;
      const H = mount.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      if (labelCanvasRef.current) {
        labelCanvasRef.current.width  = W;
        labelCanvasRef.current.height = H;
      }
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousedown',  onMouseDown);
      mount.removeEventListener('mousemove',  onMouseMove);
      mount.removeEventListener('mouseup',    onMouseUp);
      mount.removeEventListener('touchstart', onTouchStart);
      mount.removeEventListener('touchmove',  onTouchMove);
      mount.removeEventListener('touchend',   onTouchEnd);
      mount.removeEventListener('wheel',      onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(labelCanvas))         mount.removeChild(labelCanvas);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Country border lines (toggled by layerMode) ───────────────
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    if (layerMode !== 'borders') {
      if (borderLinesRef.current) borderLinesRef.current.visible = false;
      return;
    }

    if (borderLinesRef.current) { borderLinesRef.current.visible = true; return; }
    if (borderLoadingRef.current) return;
    borderLoadingRef.current = true;

    fetch(BORDERS_URL)
      .then(r => r.json())
      .then(data => {
        const lines = new THREE.LineSegments(
          buildBorderGeometry(data),
          new THREE.LineBasicMaterial({ color: 0x4488cc, opacity: 0.55, transparent: true }),
        );
        globe.add(lines);
        borderLinesRef.current   = lines;
        borderLoadingRef.current = false;
      })
      .catch(() => { borderLoadingRef.current = false; });
  }, [layerMode]);

  // ── Weather layer (temperature, rain, wind particles) ─────────────
  useEffect(() => {
    if (weatherOverlayRef.current)    weatherOverlayRef.current.visible    = weatherLayer === 'temperature';
    if (rainOverlayRef.current)       rainOverlayRef.current.visible        = weatherLayer === 'rain';
    if (windParticlesMeshRef.current) windParticlesMeshRef.current.visible  = weatherLayer === 'wind';

    if (!weatherLayer) return;

    // Use cached data if fetched within the last 30 minutes
    const now = Date.now();
    if (weatherGridRef.current && now - weatherFetchedAtRef.current < 30 * 60 * 1000) {
      // Grid already loaded — just scatter particles if switching to wind
      if (weatherLayer === 'wind') _scatterParticles();
      return;
    }

    onWeatherLoading?.(true);
    fetchWeatherGrid().then(grid => {
      weatherGridRef.current      = grid;
      weatherFetchedAtRef.current = Date.now();

      buildTemperatureCanvas(grid, weatherTexCanvasRef.current);
      if (weatherTexRef.current) weatherTexRef.current.needsUpdate = true;

      buildRainCanvas(grid, rainTexCanvasRef.current);
      if (rainTexRef.current) rainTexRef.current.needsUpdate = true;

      _scatterParticles();
    }).catch(err => console.warn('Weather grid fetch failed:', err))
      .finally(() => onWeatherLoading?.(false));

    function _scatterParticles() {
      const pd = windParticleDataRef.current;
      if (!pd) return;
      for (let i = 0; i < N_PARTICLES; i++) {
        pd.pLat[i] = (Math.random() - 0.5) * 160;
        pd.pLon[i] = (Math.random() - 0.5) * 360;
        pd.pAge[i] = Math.floor(Math.random() * MAX_PARTICLE_AGE);
      }
    }
  }, [weatherLayer]);

  return (
    <div className="globe-mount" ref={mountRef}>
      <CityLabels
        globeRef={globeRef}
        cameraRef={cameraRef}
        mountRef={mountRef}
        selectedLocation={selectedLocation}
        cityLabels={cityLabels}
      />
    </div>
  );
});

// ── HTML labels for selected city + ticker (max ~6, no perf concern) ──
function CityLabels({ globeRef, cameraRef, mountRef, selectedLocation, cityLabels }) {
  useEffect(() => {
    if (!selectedLocation) return;
    const globe  = globeRef.current;
    const camera = cameraRef.current;
    const mount  = mountRef.current;
    if (!globe || !camera || !mount) return;

    let frameId;
    // Local vectors — never touch the module-level shared ones inside this RAF
    const _pos    = new THREE.Vector3();
    const _camDir = new THREE.Vector3();
    function update() {
      frameId = requestAnimationFrame(update);
      const labels = mount.querySelectorAll('.city-label');
      const rect   = mount.getBoundingClientRect();
      labels.forEach(el => {
        const lat = +el.dataset.lat, lon = +el.dataset.lon;
        latLonToVec3(lat, lon, EARTH_RADIUS * 1.06, _pos);
        _pos.applyMatrix4(globe.matrixWorld);

        _camDir.copy(_pos).sub(camera.position).normalize();
        if (_pos.clone().normalize().dot(_camDir) > 0) { el.style.opacity = '0'; return; }

        _pos.project(camera);
        el.style.left    = `${(_pos.x * 0.5 + 0.5) * rect.width}px`;
        el.style.top     = `${(1 - (_pos.y * 0.5 + 0.5)) * rect.height}px`;
        el.style.opacity = '1';
      });
    }
    update();
    return () => cancelAnimationFrame(frameId);
  }, [selectedLocation]);

  if (!selectedLocation) return null;

  return (
    <>
      {[selectedLocation, ...(cityLabels || [])].filter(Boolean).slice(0, 6).map((c, i) => (
        <div key={i} className="city-label" data-lat={c.lat} data-lon={c.lon} style={{ opacity: 0 }}>
          <span className="city-label-dot" />
          <span className="city-label-text">{c.city}{c.temp !== undefined ? `: ${c.temp}°C` : ''}</span>
        </div>
      ))}
    </>
  );
}

export default Globe;

import { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { CAPITALS, MAJOR_CITIES } from '../utils/cityData';

const EARTH_RADIUS = 2;
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP    = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

// Layer modes — exported so App and GlobeControls can reference them
export const LAYER_BORDERS  = 0; // country borders, no city labels
export const LAYER_CAPITALS = 1; // capital cities only
export const LAYER_CITIES   = 2; // capitals + major cities
export const LAYER_PLAIN    = 3; // only the small ticker-city labels (default)

// Pre-merged at module load — not recreated on re-renders
const CAPITALS_AND_CITIES = [...CAPITALS, ...MAJOR_CITIES];

function latLonToVec3(lat, lon, radius) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vec3ToLatLon(point, radius) {
  const n = point.clone().normalize();
  const lat = Math.asin(n.y) * (180 / Math.PI);
  const lon = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

// Decode world-atlas TopoJSON arcs into a single merged LineSegments mesh.
// Built once after fetch, then toggled via .visible — no per-frame work.
function buildBorderLines(topo) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  const verts = [];
  for (const arc of topo.arcs) {
    let x = 0, y = 0;
    const pts = arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return latLonToVec3(y * sy + ty, x * sx + tx, EARTH_RADIUS * 1.003);
    });
    for (let i = 0; i < pts.length - 1; i++) verts.push(pts[i], pts[i + 1]);
  }
  const geom = new THREE.BufferGeometry().setFromPoints(verts);
  const mat  = new THREE.LineBasicMaterial({ color: 0x5599cc, transparent: true, opacity: 0.55 });
  return new THREE.LineSegments(geom, mat);
}

const Globe = forwardRef(function Globe({ onLocationSelect, selectedLocation, tickerCities, layerMode }, ref) {
  const mountRef    = useRef(null);
  const cameraRef   = useRef(null);
  const rendererRef = useRef(null);
  const globeRef    = useRef(null);
  const pinRef      = useRef(null);
  const frameRef    = useRef(null);
  const isDragging  = useRef(false);
  const autoRotate  = useRef(true);
  const borderRef   = useRef(null);    // THREE.LineSegments, built once after fetch
  const layerModeRef = useRef(layerMode); // readable in async callback after fetch

  // Keep layerModeRef current so the fetch callback applies the right visibility
  useEffect(() => { layerModeRef.current = layerMode; }, [layerMode]);

  // Compute the label list for the current mode — stable references, no per-render allocs
  const labels = useMemo(() => {
    switch (layerMode) {
      case LAYER_BORDERS:  return [];                  // borders only, no text clutter
      case LAYER_CAPITALS: return CAPITALS;
      case LAYER_CITIES:   return CAPITALS_AND_CITIES;
      case LAYER_PLAIN:
      default:             return tickerCities ?? [];  // handful of weather cities
    }
  }, [layerMode, tickerCities]);

  useImperativeHandle(ref, () => ({
    zoomIn()  { cameraRef.current && (cameraRef.current.position.z = Math.max(cameraRef.current.position.z - 0.5, 2.5)); },
    zoomOut() { cameraRef.current && (cameraRef.current.position.z = Math.min(cameraRef.current.position.z + 0.5, 9)); },
    reset()   {
      if (globeRef.current)  globeRef.current.rotation.y = 0;
      if (cameraRef.current) cameraRef.current.position.set(0, 0, 5);
      autoRotate.current = true;
    },
  }));

  // ── One-time Three.js scene setup ─────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const backLight = new THREE.DirectionalLight(0x2244aa, 0.3);
    backLight.position.set(-5, -2, -5);
    scene.add(backLight);

    const starGeom = new THREE.BufferGeometry();
    const starCount = 2000;
    const starVerts = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starVerts[i] = (Math.random() - 0.5) * 200;
    starGeom.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true })));

    const loader  = new THREE.TextureLoader();
    const mapTex  = loader.load(EARTH_TEXTURE);
    const bumpTex = loader.load(EARTH_BUMP);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    mapTex.anisotropy  = maxAniso;
    bumpTex.anisotropy = maxAniso;

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 96, 96),
      new THREE.MeshPhongMaterial({ map: mapTex, bumpMap: bumpTex, bumpScale: 0.05, specular: new THREE.Color(0x224466), shininess: 15 })
    );
    scene.add(globe);
    globeRef.current = globe;

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x1166aa, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x2288ff, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ));

    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    pin.visible = false;
    globe.add(pin);
    pinRef.current = pin;

    // ── Input handling ─────────────────────────────────────────────
    let mouseDown = false;
    let lastMouse = { x: 0, y: 0 };
    let rotVel    = { x: 0, y: 0 };
    let tapStart  = null; // touch-down position snapshot for tap detection

    function onMouseDown(e) {
      mouseDown = true;
      isDragging.current = false;
      autoRotate.current = false; // freeze immediately — click position must be stable
      lastMouse = { x: e.clientX, y: e.clientY };
      rotVel = { x: 0, y: 0 };
    }
    function onMouseMove(e) {
      if (!mouseDown) return;
      const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
      globe.rotation.y += dx * 0.003;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
      rotVel = { x: dy * 0.001, y: dx * 0.001 };
      lastMouse = { x: e.clientX, y: e.clientY };
      autoRotate.current = false;
    }
    function onMouseUp(e) {
      mouseDown = false;
      if (!isDragging.current) handleGlobeClick(e.clientX, e.clientY);
    }

    let lastPinchDist = null;
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        mouseDown = false;
        return;
      }
      const t = e.touches[0];
      mouseDown = true;
      isDragging.current = false;
      autoRotate.current = false; // freeze globe — tap position must not drift
      tapStart  = { x: t.clientX, y: t.clientY };
      lastMouse = { x: t.clientX, y: t.clientY };
      rotVel    = { x: 0, y: 0 };
    }
    function onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (lastPinchDist !== null) camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + (lastPinchDist - dist) * 0.02));
        lastPinchDist = dist;
        return;
      }
      lastPinchDist = null;
      if (!mouseDown) return;
      const t = e.touches[0], dx = t.clientX - lastMouse.x, dy = t.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
      if (isDragging.current) {
        globe.rotation.y += dx * 0.003;
        globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
        rotVel = { x: dy * 0.001, y: dx * 0.001 };
        autoRotate.current = false;
      }
      lastMouse = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd() {
      lastPinchDist = null;
      mouseDown = false;
      if (!isDragging.current && tapStart) handleGlobeClick(tapStart.x, tapStart.y);
      tapStart = null;
    }

    function handleGlobeClick(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
      const y = -((clientY - rect.top)  / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObject(globe);
      if (hits.length > 0) {
        const localPoint = hits[0].point.clone().applyMatrix4(globe.matrixWorld.clone().invert());
        const { lat, lon } = vec3ToLatLon(localPoint, EARTH_RADIUS);
        onLocationSelect(lat, lon);
      }
    }

    function onWheel(e) { e.preventDefault(); camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + e.deltaY * 0.005)); }

    mount.addEventListener('mousedown',  onMouseDown);
    mount.addEventListener('mousemove',  onMouseMove);
    mount.addEventListener('mouseup',    onMouseUp);
    mount.addEventListener('touchstart', onTouchStart, { passive: false });
    mount.addEventListener('touchmove',  onTouchMove,  { passive: false });
    mount.addEventListener('touchend',   onTouchEnd,   { passive: true });
    mount.addEventListener('wheel',      onWheel,      { passive: false });

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      if (autoRotate.current) {
        globe.rotation.y += 0.0005;
      } else {
        globe.rotation.y += rotVel.y;
        globe.rotation.x += rotVel.x;
        rotVel.x *= 0.92; rotVel.y *= 0.92;
        if (Math.abs(rotVel.x) < 0.0001 && Math.abs(rotVel.y) < 0.0001) autoRotate.current = true;
      }
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const W = mount.clientWidth, H = mount.clientHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H);
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
    };
  }, []);

  // ── Fetch country borders once, attach to globe, toggle visibility ─
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => {
        if (!globeRef.current) return;
        const lines = buildBorderLines(topo);
        lines.visible = layerModeRef.current === LAYER_BORDERS;
        globeRef.current.add(lines);
        borderRef.current = lines;
      })
      .catch(() => {}); // silent fail when offline
  }, []);

  // ── Show/hide borders on layer change (no rebuild) ─────────────────
  useEffect(() => {
    if (borderRef.current) borderRef.current.visible = (layerMode === LAYER_BORDERS);
  }, [layerMode]);

  // ── Move pin when selected location changes ────────────────────────
  useEffect(() => {
    if (!pinRef.current || !selectedLocation) return;
    pinRef.current.position.copy(latLonToVec3(selectedLocation.lat, selectedLocation.lon, EARTH_RADIUS * 1.015));
    pinRef.current.visible = true;
  }, [selectedLocation]);

  return (
    <div className="globe-mount" ref={mountRef}>
      <CityLabels
        globeRef={globeRef}
        cameraRef={cameraRef}
        mountRef={mountRef}
        labels={labels}
        selectedLocation={selectedLocation}
      />
    </div>
  );
});

// ── HTML label overlay ────────────────────────────────────────────────
// Runs its own rAF loop to project 3D positions to screen space.
// Element cache is populated once per label-set change to avoid
// querySelectorAll on every frame.
function CityLabels({ globeRef, cameraRef, mountRef, labels, selectedLocation }) {
  const elCacheRef = useRef([]);

  useEffect(() => {
    const hasSelected = !!selectedLocation;
    const hasLabels   = labels.length > 0;
    if (!hasSelected && !hasLabels) return;

    const globe  = globeRef.current;
    const camera = cameraRef.current;
    const mount  = mountRef.current;
    if (!globe || !camera || !mount) return;

    // Cache once — querySelectorAll inside rAF is expensive
    elCacheRef.current = Array.from(mount.querySelectorAll('.city-label'));

    let frameId;
    function update() {
      frameId = requestAnimationFrame(update);
      const z           = camera.position.z;
      // LOD thresholds: priority 1 always shows; 2 needs z<4.2; 3 needs z<3.2
      const maxPriority = z < 3.2 ? 3 : z < 4.2 ? 2 : 1;
      const rect        = mount.getBoundingClientRect();

      for (const el of elCacheRef.current) {
        const p = el.dataset.priority | 0; // priority 0 = selected city (always shown)
        if (p !== 0 && p > maxPriority) { el.style.opacity = '0'; continue; }

        const pos      = latLonToVec3(+el.dataset.lat, +el.dataset.lon, EARTH_RADIUS * 1.06);
        const worldPos = pos.clone().applyMatrix4(globe.matrixWorld);

        // Back-face cull: hide labels on the far side of the globe
        const dot = worldPos.clone().normalize().dot(worldPos.clone().sub(camera.position).normalize());
        if (dot > 0) { el.style.opacity = '0'; continue; }

        const proj = worldPos.clone().project(camera);
        el.style.left    = `${(proj.x * 0.5 + 0.5) * rect.width}px`;
        el.style.top     = `${(1 - (proj.y * 0.5 + 0.5)) * rect.height}px`;
        el.style.opacity = '1';
      }
    }
    update();
    return () => cancelAnimationFrame(frameId);
  }, [labels, selectedLocation]);

  if (!selectedLocation && labels.length === 0) return null;

  return (
    <>
      {/* Selected city — priority 0, always visible */}
      {selectedLocation && (
        <div
          className="city-label"
          data-lat={selectedLocation.lat}
          data-lon={selectedLocation.lon}
          data-priority="0"
          data-type="selected"
          style={{ opacity: 0 }}
        >
          <span className="city-label-dot" />
          <span className="city-label-text">{selectedLocation.city}</span>
        </div>
      )}
      {/* Layer-mode labels */}
      {labels.map((c, i) => (
        <div
          key={i}
          className="city-label"
          data-lat={c.lat}
          data-lon={c.lon}
          data-priority={c.priority ?? 1}
          data-type={c.type ?? 'city'}
          style={{ opacity: 0 }}
        >
          <span className="city-label-dot" />
          <span className="city-label-text">
            {c.city}{c.temp !== undefined ? `: ${c.temp}°C` : ''}
          </span>
        </div>
      ))}
    </>
  );
}

export default Globe;

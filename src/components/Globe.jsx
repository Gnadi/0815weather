import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { CAPITALS, MAJOR_CITIES } from '../data/cities';

const EARTH_RADIUS = 2;
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP    = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

// camera.position.z thresholds (smaller = more zoomed in, range 2.5–9)
const CAPITAL_SHOW_Z  = 4.5; // capitals appear below this zoom level
const CITY_SHOW_Z     = 3.5; // big non-capital cities appear below this

// Convert lat/lon to 3D point on sphere
function latLonToVec3(lat, lon, radius) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Convert a 3D local point on a sphere to lat/lon
function vec3ToLatLon(point, radius) {
  const n = point.clone().normalize();
  const lat = Math.asin(n.y) * (180 / Math.PI);
  const lon = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

// ── TopoJSON decoder ──────────────────────────────────────────────────────────
// Minimal inline decoder for world-atlas countries-110m.json (no external dep)
function decodeTopo(topo) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;

  // Delta-decode quantized arc coordinates → [lon, lat] pairs
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });

  // Resolve arc index (negative = reversed arc)
  function resolveArc(idx) {
    return idx < 0 ? [...arcs[~idx]].reverse() : arcs[idx];
  }

  // Flatten a geometry's rings into coordinate sequences
  function extractRings(geom) {
    if (geom.type === 'Polygon')      return geom.arcs;
    if (geom.type === 'MultiPolygon') return geom.arcs.flat();
    return [];
  }

  const rings = [];
  for (const geom of topo.objects.countries.geometries) {
    for (const ringIdxs of extractRings(geom)) {
      // Stitch arc segments into one continuous ring
      let coords = [];
      for (const idx of ringIdxs) {
        const arc = resolveArc(idx);
        coords.push(...(coords.length ? arc.slice(1) : arc));
      }
      rings.push(coords);
    }
  }
  return rings; // each ring: [[lon, lat], ...]
}

// Build a single THREE.LineSegments for all border rings (1 draw call)
function buildBorderLines(rings) {
  const positions = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[i + 1];
      const p1 = latLonToVec3(lat1, lon1, EARTH_RADIUS * 1.001);
      const p2 = latLonToVec3(lat2, lon2, EARTH_RADIUS * 1.001);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(
    geom,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  );
}

// ── Globe component ───────────────────────────────────────────────────────────
const Globe = forwardRef(function Globe({ onLocationSelect, selectedLocation, cityLabels, layerMode = 0 }, ref) {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const rendererRef = useRef(null);
  const globeRef    = useRef(null);
  const pinRef      = useRef(null);
  const frameRef    = useRef(null);
  const isDragging  = useRef(false);
  const autoRotate  = useRef(true);

  // Border lines state
  const bordersRef      = useRef(null);  // THREE.LineSegments once loaded
  const bordersReady    = useRef(false);
  const bordersLoading  = useRef(false);

  useImperativeHandle(ref, () => ({
    zoomIn()  { cameraRef.current && (cameraRef.current.position.z = Math.max(cameraRef.current.position.z - 0.5, 2.5)); },
    zoomOut() { cameraRef.current && (cameraRef.current.position.z = Math.min(cameraRef.current.position.z + 0.5, 9)); },
    reset()   {
      if (globeRef.current)  { globeRef.current.rotation.y = 0; }
      if (cameraRef.current) { cameraRef.current.position.set(0, 0, 5); }
      autoRotate.current = true;
    },
  }));

  // ── Three.js scene setup (runs once) ────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x404060, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const backLight = new THREE.DirectionalLight(0x2244aa, 0.3);
    backLight.position.set(-5, -2, -5);
    scene.add(backLight);

    // Stars
    const starGeom = new THREE.BufferGeometry();
    const starCount = 2000;
    const starVerts = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starVerts[i] = (Math.random() - 0.5) * 200;
    starGeom.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true })));

    // Earth sphere
    const loader  = new THREE.TextureLoader();
    const mapTex  = loader.load(EARTH_TEXTURE);
    const bumpTex = loader.load(EARTH_BUMP);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    mapTex.anisotropy  = maxAniso;
    bumpTex.anisotropy = maxAniso;
    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
    const earthMat  = new THREE.MeshPhongMaterial({
      map:         mapTex,
      bumpMap:     bumpTex,
      bumpScale:   0.05,
      specular:    new THREE.Color(0x224466),
      shininess:   15,
    });
    const globe = new THREE.Mesh(earthGeom, earthMat);
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x1166aa, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x2288ff, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ));

    // City pin
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    );
    pin.visible = false;
    globe.add(pin);
    pinRef.current = pin;

    // Mouse / touch orbit state
    let mouseDown = false;
    let lastMouse = { x: 0, y: 0 };
    let rotVel    = { x: 0, y: 0 };

    function onMouseDown(e) {
      mouseDown = true;
      isDragging.current = false;
      lastMouse = { x: e.clientX, y: e.clientY };
      rotVel = { x: 0, y: 0 };
    }
    function onMouseMove(e) {
      if (!mouseDown) return;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
      globe.rotation.y += dx * 0.003;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
      rotVel = { x: dy * 0.001, y: dx * 0.001 };
      lastMouse = { x: e.clientX, y: e.clientY };
      autoRotate.current = false;
    }
    function onMouseUp(e) {
      mouseDown = false;
      if (!isDragging.current) handleGlobeClick(e);
    }

    let lastPinchDist = null;
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        mouseDown = false;
        return;
      }
      const t = e.touches[0];
      mouseDown = true;
      isDragging.current = false;
      lastMouse = { x: t.clientX, y: t.clientY };
      rotVel = { x: 0, y: 0 };
    }
    function onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDist !== null) {
          camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + (lastPinchDist - dist) * 0.02));
        }
        lastPinchDist = dist;
        return;
      }
      lastPinchDist = null;
      if (!mouseDown) return;
      const t = e.touches[0];
      const dx = t.clientX - lastMouse.x;
      const dy = t.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
      globe.rotation.y += dx * 0.003;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.003));
      rotVel = { x: dy * 0.001, y: dx * 0.001 };
      lastMouse = { x: t.clientX, y: t.clientY };
      autoRotate.current = false;
    }
    function onTouchEnd(e) {
      lastPinchDist = null;
      mouseDown = false;
      if (!isDragging.current && e.changedTouches.length > 0) {
        handleGlobeClick(e.changedTouches[0]);
      }
    }

    function handleGlobeClick(e) {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObject(globe);
      if (hits.length > 0) {
        const localPoint = hits[0].point.clone().applyMatrix4(globe.matrixWorld.clone().invert());
        const { lat, lon } = vec3ToLatLon(localPoint, EARTH_RADIUS);
        onLocationSelect(lat, lon);
      }
    }

    function onWheel(e) {
      e.preventDefault();
      camera.position.z = Math.max(2.5, Math.min(9, camera.position.z + e.deltaY * 0.005));
    }

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
        rotVel.x *= 0.92;
        rotVel.y *= 0.92;
        if (Math.abs(rotVel.x) < 0.0001 && Math.abs(rotVel.y) < 0.0001) autoRotate.current = true;
      }
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const W = mount.clientWidth;
      const H = mount.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
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

  // ── Borders layer: load on first use, show/hide on layerMode change ─────────
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const wantBorders = layerMode === 1;

    if (wantBorders && !bordersReady.current && !bordersLoading.current) {
      bordersLoading.current = true;
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(r => r.json())
        .then(topo => {
          const lines = buildBorderLines(decodeTopo(topo));
          globe.add(lines);
          bordersRef.current = lines;
          bordersReady.current  = true;
          bordersLoading.current = false;
          // Respect current layerMode at the time loading finishes
          lines.visible = layerMode === 1;
        })
        .catch(err => {
          console.error('Failed to load border data:', err);
          bordersLoading.current = false;
        });
    } else if (bordersRef.current) {
      bordersRef.current.visible = wantBorders;
    }
  }, [layerMode]);

  // ── Pin: update when selectedLocation changes ────────────────────────────────
  useEffect(() => {
    if (!pinRef.current || !globeRef.current || !selectedLocation) return;
    const { lat, lon } = selectedLocation;
    const pos = latLonToVec3(lat, lon, EARTH_RADIUS * 1.015);
    pinRef.current.position.copy(pos);
    pinRef.current.visible = true;
  }, [selectedLocation]);

  return (
    <div className="globe-mount" ref={mountRef}>
      <CityLabels
        globeRef={globeRef}
        cameraRef={cameraRef}
        mountRef={mountRef}
        selectedLocation={selectedLocation}
        cityLabels={cityLabels}
        layerMode={layerMode}
      />
    </div>
  );
});

// ── CityLabels overlay ────────────────────────────────────────────────────────
function CityLabels({ globeRef, cameraRef, mountRef, selectedLocation, cityLabels, layerMode }) {
  const geoContainerRef     = useRef(null);
  const weatherContainerRef = useRef(null);

  // Single persistent RAF loop – uses container refs, never querySelectorAll
  useEffect(() => {
    let frameId;
    function update() {
      frameId = requestAnimationFrame(update);
      const globe  = globeRef.current;
      const camera = cameraRef.current;
      const mount  = mountRef.current;
      if (!globe || !camera || !mount) return;

      const cameraZ = camera.position.z;

      // ── Geo labels: hide entire container when zoomed out ─────────────────
      const geoContainer = geoContainerRef.current;
      if (geoContainer) {
        if (cameraZ >= CAPITAL_SHOW_Z) {
          // Too far out – single op hides all geo labels, skip all 3D math
          geoContainer.style.visibility = 'hidden';
        } else {
          geoContainer.style.visibility = 'visible';

          // getBoundingClientRect once per frame (not per label)
          const rect = mount.getBoundingClientRect();

          const els = geoContainer.children;
          for (let i = 0; i < els.length; i++) {
            const el = els[i];

            // Big non-capital cities: additional zoom gate
            if (el.dataset.bigcity === 'true' && cameraZ >= CITY_SHOW_Z) {
              el.style.opacity = '0';
              continue;
            }

            positionLabel(el, globe, camera, rect);
          }
        }
      }

      // ── Weather labels: always process (max ~6 elements) ─────────────────
      const weatherContainer = weatherContainerRef.current;
      if (weatherContainer && weatherContainer.children.length) {
        const rect = mount.getBoundingClientRect();
        const els  = weatherContainer.children;
        for (let i = 0; i < els.length; i++) {
          positionLabel(els[i], globe, camera, rect);
        }
      }
    }

    update();
    return () => cancelAnimationFrame(frameId);
  }, []); // runs once; loop reads DOM dynamically each frame

  // Geo labels: capitals (mode 2), capitals + big cities (mode 3)
  const geoLabels = layerMode === 2
    ? CAPITALS
    : layerMode === 3
      ? [...CAPITALS, ...MAJOR_CITIES]
      : null;

  // Weather labels: always shown when a location is selected
  const weatherLabels = selectedLocation
    ? [selectedLocation, ...(cityLabels || [])].filter(Boolean).slice(0, 6)
    : [];

  return (
    <>
      {/* Geo overlay labels – in a container so they can be hidden in bulk */}
      <div ref={geoContainerRef} style={{ visibility: 'hidden' }}>
        {geoLabels && geoLabels.map((c, i) => {
          const isBigCity = layerMode === 3 && i >= CAPITALS.length;
          return (
            <div
              key={`geo-${c.city}-${i}`}
              className="city-label city-label-geo"
              data-lat={c.lat}
              data-lon={c.lon}
              data-bigcity={isBigCity ? 'true' : 'false'}
              style={{ opacity: 0 }}
            >
              <span className="city-label-dot city-label-dot-geo" />
              <span className="city-label-text">{c.city}</span>
            </div>
          );
        })}
      </div>

      {/* Weather / selection labels */}
      <div ref={weatherContainerRef}>
        {weatherLabels.map((c, i) => (
          <div
            key={`weather-${i}`}
            className="city-label"
            data-lat={c.lat}
            data-lon={c.lon}
            style={{ opacity: 0 }}
          >
            <span className="city-label-dot" />
            <span className="city-label-text">
              {c.city}{c.temp !== undefined ? `: ${c.temp}°C` : ''}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// Position a single label element in screen space
function positionLabel(el, globe, camera, rect) {
  const lat = parseFloat(el.dataset.lat);
  const lon = parseFloat(el.dataset.lon);
  const pos      = latLonToVec3(lat, lon, EARTH_RADIUS * 1.06);
  const worldPos = pos.clone().applyMatrix4(globe.matrixWorld);

  // Back-face cull: hide labels on the far hemisphere
  const surfaceNormal = worldPos.clone().normalize();
  const camDir        = worldPos.clone().sub(camera.position).normalize();
  if (surfaceNormal.dot(camDir) > 0) { el.style.opacity = '0'; return; }

  const projected = worldPos.clone().project(camera);
  el.style.left    = `${(projected.x *  0.5 + 0.5) * rect.width}px`;
  el.style.top     = `${(1 - (projected.y * 0.5 + 0.5)) * rect.height}px`;
  el.style.opacity = '1';
}

export default Globe;

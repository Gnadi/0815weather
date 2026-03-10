import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

const EARTH_RADIUS = 2;
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP    = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

// Convert lat/lon to 3D point on sphere (accounting for Three.js coordinate system)
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

const Globe = forwardRef(function Globe({ onLocationSelect, selectedLocation, cityLabels }, ref) {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const rendererRef = useRef(null);
  const globeRef    = useRef(null);
  const pinRef      = useRef(null);
  const frameRef    = useRef(null);
  const isDragging  = useRef(false);
  const autoRotate  = useRef(true);

  useImperativeHandle(ref, () => ({
    zoomIn()  { cameraRef.current && (cameraRef.current.position.z = Math.max(cameraRef.current.position.z - 0.5, 2.5)); },
    zoomOut() { cameraRef.current && (cameraRef.current.position.z = Math.min(cameraRef.current.position.z + 0.5, 9)); },
    reset()   {
      if (globeRef.current)  { globeRef.current.rotation.y = 0; }
      if (cameraRef.current) { cameraRef.current.position.set(0, 0, 5); }
      autoRotate.current = true;
    },
  }));

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

    // Stars background
    const starGeom = new THREE.BufferGeometry();
    const starCount = 2000;
    const starVerts = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starVerts[i] = (Math.random() - 0.5) * 200;
    starGeom.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true })));

    // Earth sphere
    const loader = new THREE.TextureLoader();
    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMat  = new THREE.MeshPhongMaterial({
      map:         loader.load(EARTH_TEXTURE),
      bumpMap:     loader.load(EARTH_BUMP),
      bumpScale:   0.05,
      specular:    new THREE.Color(0x224466),
      shininess:   15,
    });
    const globe = new THREE.Mesh(earthGeom, earthMat);
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere glow
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 64, 64);
    const atmosMat  = new THREE.MeshBasicMaterial({
      color: 0x1166aa,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    // Outer glow ring
    const glowGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.06, 64, 64);
    const glowMat  = new THREE.MeshBasicMaterial({
      color: 0x2288ff,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeom, glowMat));

    // City pin (updated via selectedLocation effect)
    const pinGeom = new THREE.SphereGeometry(0.035, 16, 16);
    const pinMat  = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.visible = false;
    globe.add(pin);
    pinRef.current = pin;

    // Mouse state for orbit
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
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.005));
      rotVel = { x: dy * 0.002, y: dx * 0.002 };
      lastMouse = { x: e.clientX, y: e.clientY };
      autoRotate.current = false;
    }

    function onMouseUp(e) {
      mouseDown = false;
      // If not dragging → it was a click
      if (!isDragging.current) handleGlobeClick(e);
    }

    function onTouchStart(e) {
      const t = e.touches[0];
      mouseDown = true;
      isDragging.current = false;
      lastMouse = { x: t.clientX, y: t.clientY };
    }
    function onTouchMove(e) {
      const t = e.touches[0];
      const dx = t.clientX - lastMouse.x;
      const dy = t.clientY - lastMouse.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globe.rotation.x + dy * 0.005));
      lastMouse = { x: t.clientX, y: t.clientY };
      autoRotate.current = false;
    }
    function onTouchEnd(e) {
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
    mount.addEventListener('touchstart', onTouchStart, { passive: true });
    mount.addEventListener('touchmove',  onTouchMove,  { passive: true });
    mount.addEventListener('touchend',   onTouchEnd);
    mount.addEventListener('wheel',      onWheel,      { passive: false });

    // Animation loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      if (autoRotate.current) {
        globe.rotation.y += 0.0015;
      } else {
        // Damping
        globe.rotation.y += rotVel.y;
        globe.rotation.x += rotVel.x;
        rotVel.x *= 0.95;
        rotVel.y *= 0.95;
        if (Math.abs(rotVel.x) < 0.0001 && Math.abs(rotVel.y) < 0.0001) autoRotate.current = true;
      }
      renderer.render(scene, camera);
    }
    animate();

    // Resize
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

  // Update pin when selectedLocation changes
  useEffect(() => {
    if (!pinRef.current || !globeRef.current || !selectedLocation) return;
    const { lat, lon } = selectedLocation;
    const pos = latLonToVec3(lat, lon, EARTH_RADIUS * 1.015);
    // pos is in world space relative to globe center
    pinRef.current.position.copy(pos);
    pinRef.current.visible = true;
  }, [selectedLocation]);

  // City labels rendered as HTML overlays
  const labelEls = cityLabels?.map((c, i) => {
    if (!globeRef.current || !cameraRef.current || !rendererRef.current) return null;
    return null; // Labels are updated in useEffect below
  });

  return (
    <div className="globe-mount" ref={mountRef}>
      {/* City label HTML overlay - rendered via absolute positioning via separate effect */}
      <CityLabels
        globeRef={globeRef}
        cameraRef={cameraRef}
        rendererRef={rendererRef}
        mountRef={mountRef}
        selectedLocation={selectedLocation}
        cityLabels={cityLabels}
      />
    </div>
  );
});

function CityLabels({ globeRef, cameraRef, mountRef, selectedLocation, cityLabels }) {
  const labelsRef = useRef([]);

  useEffect(() => {
    if (!selectedLocation) return;

    const globe   = globeRef.current;
    const camera  = cameraRef.current;
    const mount   = mountRef.current;
    if (!globe || !camera || !mount) return;

    let frameId;
    function update() {
      frameId = requestAnimationFrame(update);
      const labels = mount.querySelectorAll('.city-label');
      labels.forEach(el => {
        const lat = parseFloat(el.dataset.lat);
        const lon = parseFloat(el.dataset.lon);
        const pos = latLonToVec3(lat, lon, EARTH_RADIUS * 1.06);

        // Transform to world space
        const worldPos = pos.clone().applyMatrix4(globe.matrixWorld);

        // Check if facing camera
        const camDir = worldPos.clone().sub(camera.position).normalize();
        const surfaceNormal = worldPos.clone().normalize();
        const dot = surfaceNormal.dot(camDir);
        if (dot > 0) { el.style.opacity = '0'; return; }

        // Project to screen
        const projected = worldPos.clone().project(camera);
        const rect = mount.getBoundingClientRect();
        const x = (projected.x * 0.5 + 0.5) * rect.width;
        const y = (1 - (projected.y * 0.5 + 0.5)) * rect.height;
        el.style.left   = `${x}px`;
        el.style.top    = `${y}px`;
        el.style.opacity = '1';
      });
    }
    update();
    return () => cancelAnimationFrame(frameId);
  }, [selectedLocation]);

  if (!selectedLocation) return null;

  const allLabels = [
    selectedLocation,
    ...(cityLabels || []),
  ].filter(Boolean);

  return (
    <>
      {allLabels.slice(0, 6).map((c, i) => (
        <div
          key={i}
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
    </>
  );
}

export default Globe;

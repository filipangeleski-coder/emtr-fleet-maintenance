/* ==========================================================================
   EMTR — three.js diesel-engine schematic (fixed hand-picked angle).
   Loaded LAZILY by engine.js only after the mobile / reduced-motion / save-data
   gates pass. Renders the Spline-designed engine as a compressed local GLB
   (~356KB on disk) in our own renderer: capped resolution, pauses off-screen,
   subtle pointer parallax only (no auto-rotation), materialed in code.
   ========================================================================== */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function boot(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { return; }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = canvas.parentElement;
  let W = canvas.clientWidth || wrap.clientWidth, H = canvas.clientHeight || wrap.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // resolution cap = the big perf win
  renderer.setSize(W, H, false);
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0x55617e, 0.8));
  const key = new THREE.DirectionalLight(0xeaf1ff, 3.0); key.position.set(5, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x2f7dff, 3.0); rim.position.set(-7, 2, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 1.2); fill.position.set(2, 1, 8); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 5000);
  const baseDir = new THREE.Vector3(0.45, 0.32, 1).normalize();  // front 3/4 of the long side, fixed
  const center = new THREE.Vector3();
  const _c = new THREE.Vector3();
  let sphere = null, model = null, ready = false, introT = 0, mx = 0;

  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.load("assets/models/engine_spline.glb?v=2", (g) => {
    model = g.scene;
    // the free Spline export ships no materials (flat grey); paint on machined steel + brand-blue accents
    const STEEL = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 1.0, roughness: 0.33, envMapIntensity: 1.7 });
    const DARK = new THREE.MeshStandardMaterial({ color: 0x394150, metalness: 1.0, roughness: 0.5, envMapIntensity: 1.2 });
    const ACCENT = new THREE.MeshStandardMaterial({ color: 0x1f2a44, metalness: 0.7, roughness: 0.4, emissive: 0x2f7dff, emissiveIntensity: 0.9 });
    let mi = 0;
    model.traverse((o) => { if (o.isMesh) { o.material = (mi % 7 === 0) ? ACCENT : (mi % 3 === 0 ? DARK : STEEL); mi++; } });
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model);
    box.getCenter(center);
    sphere = box.getBoundingSphere(new THREE.Sphere());
    fit();
    ready = true;
    canvas.classList.add("ready");
    clock.getDelta();
    requestAnimationFrame(frame);
  }, undefined, (e) => { console.warn("engine_spline.glb failed", e); });

  function camDist() {
    const aspect = W / H;
    const vf = (40 * Math.PI) / 180;
    let d = sphere.radius / Math.sin(vf / 2);
    if (aspect < 1) d /= aspect;          // portrait: pull back to fit the whole engine
    return d * 0.95;
  }
  function fit() {
    if (!sphere) return;
    const d = camDist();
    camera.position.copy(center).addScaledVector(baseDir, d);
    camera.lookAt(center);
    camera.aspect = W / H;
    camera.near = Math.max(0.01, d * 0.02);
    camera.far = d * 4 + sphere.radius * 2;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("pointermove", (e) => { mx = (e.clientX / window.innerWidth - 0.5) * 2; }, { passive: true });

  const clock = new THREE.Clock();
  let running = true, visible = true;
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (introT < 1) introT = Math.min(1, introT + dt / 1.6);
    if (ready && sphere) {
      const d = camDist();
      const intro = reduced ? 0 : (1 - easeOut(introT)) * 0.18;  // gentle one-time settle on load only
      _c.copy(center).addScaledVector(baseDir, d * (1 + intro));
      camera.position.lerp(_c, 0.12);
      camera.lookAt(center);
      if (model && !reduced) { model.rotation.y = mx * 0.18; }   // subtle pointer parallax only, no auto-rotation
    }
    renderer.render(scene, camera);
    if (running && visible) requestAnimationFrame(frame);
  }

  function onResize() { W = canvas.clientWidth || wrap.clientWidth; H = canvas.clientHeight || wrap.clientHeight; renderer.setSize(W, H, false); fit(); }
  window.addEventListener("resize", onResize, { passive: true });

  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && running && ready) { clock.getDelta(); requestAnimationFrame(frame); }
  }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && visible && ready) { clock.getDelta(); requestAnimationFrame(frame); }
  });
}

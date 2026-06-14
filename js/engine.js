/* ==========================================================================
   EMTR — cinematic 3D engine hero (three.js)
   Loads a real detailed engine model, renders it with HDRI reflections +
   bloom, plays an exploded-view assembly reveal on load, and bursts apart +
   revs when a "Call" CTA is hovered. Degrades to a procedural engine, then
   to the CSS hero, if anything is unavailable.
   ========================================================================== */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvas = document.getElementById("engine-canvas");
if (canvas) boot();

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = canvas.parentElement;
  let W = wrap.clientWidth, H = wrap.clientHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

  renderer.setSize(W, H, false);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(4.2, 1.6, 8.4);
  camera.lookAt(0, 0, 0);

  // HDRI-style reflections (no external file)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;   // instant fallback env
  // real HDRI for proper metal reflections (replaces the flat studio env once loaded)
  new RGBELoader().load("assets/models/warehouse.hdr", (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
  });

  // dramatic lighting
  scene.add(new THREE.AmbientLight(0x35425e, 0.5));
  const key = new THREE.DirectionalLight(0xeaf1ff, 2.1); key.position.set(6, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x2f7dff, 3.0); rim.position.set(-8, 2, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9ec2ff, 0.5); fill.position.set(2, -5, 7); scene.add(fill);
  const glow = new THREE.PointLight(0x3a8bff, 9, 16, 2); glow.position.set(-1.6, 1.4, 3); scene.add(glow);

  // post: bloom
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(DPR);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const pivot = new THREE.Group();
  scene.add(pivot);

  let meshes = [];
  let spread = 1;
  let ready = false;
  let introT = 0;            // 0..1 assembly progress after load
  const INTRO_DUR = 1.9;

  // ---- load the real engine ----
  new GLTFLoader().load(
    "assets/models/engine.glb",
    (gltf) => {
      const raw = gltf.scene;
      raw.updateMatrixWorld(true);

      // centre + scale to fit
      let box = new THREE.Box3().setFromObject(raw);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 4.4 / maxDim;
      raw.position.sub(center);
      pivot.scale.setScalar(scale);
      pivot.position.set(1.6, -0.1, 0);   // sit on the right, clear of the headline
      pivot.add(raw);

      // flatten meshes onto pivot so explode math is in one space
      raw.updateMatrixWorld(true);
      // unify every part to machined gunmetal steel (the source model's cream/teal
      // plastic materials read wrong; real metal + HDRI reads like a true engine)
      const STEEL = new THREE.MeshStandardMaterial({ color: 0x8b95a3, metalness: 1.0, roughness: 0.33, envMapIntensity: 1.25 });
      const DARK = new THREE.MeshStandardMaterial({ color: 0x3a4150, metalness: 1.0, roughness: 0.5, envMapIntensity: 1.0 });
      const collected = [];
      raw.traverse((o) => { if (o.isMesh) collected.push(o); });
      collected.forEach((m, idx) => {
        pivot.attach(m);
        m.material = idx % 3 === 0 ? DARK : STEEL;   // subtle two-tone so it isn't flat
        m.castShadow = false; m.receiveShadow = false;
        m.userData.base = m.position.clone();
        let d = m.position.clone();
        if (d.length() < 1e-3) d.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        m.userData.dir = d.normalize();
      });
      meshes = collected;
      spread = Math.max(0.5, ...meshes.map((m) => m.userData.base.length())) * 0.85;

      pivot.rotation.y = -0.5;
      ready = true;
      canvas.classList.add("ready");
      clock.getDelta();
      requestAnimationFrame(frame);
    },
    undefined,
    (err) => { console.warn("engine.glb failed, using fallback", err); buildFallback(); }
  );

  // ---- interaction: rev / burst on hover ----
  let hoverBoost = 0, hoverTarget = 0;
  window.addEventListener("emtr:rev", (e) => { hoverTarget = e.detail ? 1 : 0; });

  let mouseX = 0, mouseY = 0;
  window.addEventListener("pointermove", (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // ---- animation ----
  const clock = new THREE.Clock();
  let running = true, visible = true;
  let rotY = -0.5, rotX = 0;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    hoverBoost += (hoverTarget - hoverBoost) * 0.07;
    if (introT < 1) introT = Math.min(1, introT + dt / INTRO_DUR);

    if (ready) {
      const scrollP = reduced ? 0 : Math.min(1, (window.scrollY || 0) / Math.max(1, wrap.clientHeight));
      const introExplode = reduced ? 0 : (1 - easeOutCubic(introT)) * 0.8;   // starts exploded, assembles
      const explodeAmt = Math.min(1.0, introExplode + hoverBoost * 0.5 + scrollP * 0.22);
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        m.position.copy(m.userData.base).addScaledVector(m.userData.dir, explodeAmt * spread);
      }
      const spin = reduced ? 0 : (0.22 + hoverBoost * 1.8);
      rotY += dt * spin;
      rotX += (mouseY * 0.16 - rotX) * 0.05;
      const sway = reduced ? 0 : Math.sin(clock.elapsedTime * 0.15) * 0.1;
      pivot.rotation.y = rotY + sway + mouseX * 0.35 + scrollP * 1.4;
      pivot.rotation.x = rotX + scrollP * 0.25;
      bloom.strength = 0.4 + hoverBoost * 0.5;
      glow.intensity = 9 + hoverBoost * 10;
      camera.position.z = 8.4 - hoverBoost * 0.7;
      camera.lookAt(0, 0, 0);
    }

    composer.render();
    if (running && visible) requestAnimationFrame(frame);
  }

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  // ---- resize ----
  function onResize() {
    W = wrap.clientWidth; H = wrap.clientHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
  }
  window.addEventListener("resize", onResize, { passive: true });

  // ---- pause off-screen / hidden ----
  const io = new IntersectionObserver((ents) => {
    visible = ents[0].isIntersecting;
    if (visible && running && ready) { clock.getDelta(); requestAnimationFrame(frame); }
  }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && visible && ready) { clock.getDelta(); requestAnimationFrame(frame); }
  });

  // ---- procedural fallback (only if the GLB cannot load) ----
  function buildFallback() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b7686, metalness: 1, roughness: 0.32, envMapIntensity: 1.2 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x1f2a44, metalness: 0.6, roughness: 0.4, emissive: 0x2f7dff, emissiveIntensity: 1.2 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 1.6), mat); pivot.add(block);
    const pistons = [];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 28), mat);
      p.position.set(-1.5 + i, 0.9, 0); pivot.add(p); pistons.push(p);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 28), accent);
      ring.rotation.x = Math.PI / 2; ring.position.set(-1.5 + i, 1.32, 0); pivot.add(ring);
    }
    meshes = []; ready = true; spread = 0;
    canvas.classList.add("ready"); clock.getDelta();
    let t = 0;
    (function loop() {
      const dt = Math.min(clock.getDelta(), 0.05); t += dt;
      hoverBoost += (hoverTarget - hoverBoost) * 0.07;
      pivot.rotation.y += dt * (0.3 + hoverBoost * 1.6);
      for (let i = 0; i < pistons.length; i++) pistons[i].position.y = 0.9 + Math.sin(t * 6 + i * Math.PI / 2) * 0.16;
      bloom.strength = 0.6 + hoverBoost * 1.0;
      composer.render();
      if (running && visible) requestAnimationFrame(loop);
    })();
  }
}

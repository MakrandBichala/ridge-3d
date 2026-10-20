  import * as THREE from "three";
  import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

  const box = document.getElementById("scene3d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;   // keeps the snow bright without clipping
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 3.1, 7.2); camera.lookAt(0, 0.55, 0);
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0x8a7e6c, 1.35));
  const key = new THREE.DirectionalLight(0xffe6c8, 2.2); key.position.set(3, 5, 2); scene.add(key);

  const world = new THREE.Group(); scene.add(world);           // everything that rotates
  const terracotta = 0xc8553a;

  // trail drawn from base to summit, looping
  let trail, dot, ring, curve, tubeIdx = 0;
  const SEG = 600, RAD = 6;
  fetch("assets/path.json").then(r => r.json()).then(p => {
    curve = new THREE.CatmullRomCurve3(p.map(v => new THREE.Vector3(...v)));
    const g = new THREE.TubeGeometry(curve, SEG, 0.013, RAD, false);
    tubeIdx = g.index.count;
    trail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: terracotta, transparent: true }));
    dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true }));
    const top = curve.getPoint(1);
    ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xe6c27a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(top).add(new THREE.Vector3(0, 0.02, 0));
    world.add(trail, dot, ring);
  });

  new GLTFLoader().load("assets/mountain.glb", g => { g.scene.traverse(o => { if (o.isMesh) o.material.flatShading = true; }); world.add(g.scene); });

  const ease = t => t * t * (3 - 2 * t);
  const T_DRAW = 11, T_HOLD = 4, T_FADE = 3, T_GAP = 3, LOOP = T_DRAW + T_HOLD + T_FADE + T_GAP;

  function resize() {
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  let visible = true; new IntersectionObserver(e => visible = e[0].isIntersecting).observe(box);
  const clock = new THREE.Clock(); let rot = 0.6, vel = 0, tilt = 0, dragging = false, lx = 0, ly = 0;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e => { dragging = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    rot += dx * 0.01; vel = dx * 0.01; tilt = Math.max(-0.3, Math.min(0.3, tilt + dy * 0.004)); });
  const end = () => dragging = false;
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

  (function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible) return;
    if (!dragging) { vel *= 0.95; rot += vel + (reduce ? 0 : dt * 0.16); tilt *= 0.97; }   // inertia, then the slow turn resumes
    world.rotation.y = rot; world.rotation.x = tilt;
    world.position.y = Math.sin(t * 0.8) * 0.04;                  // barely-there float

    if (trail) {
      const c = reduce ? T_DRAW + 0.1 : t % LOOP;
      let draw = 0, fade = 1, ringT = -1;
      if (c < T_DRAW) draw = ease(c / T_DRAW);
      else { draw = 1; if (c < T_DRAW + T_HOLD) ringT = (c - T_DRAW) / T_HOLD;
             else fade = Math.max(0, 1 - (c - T_DRAW - T_HOLD) / T_FADE); }
      if (c > T_DRAW + T_HOLD + T_FADE) draw = 0;
      trail.geometry.setDrawRange(0, Math.floor(draw * SEG) * RAD * 6);
      trail.material.opacity = fade;
      dot.visible = draw > 0 && draw < 1; dot.position.copy(curve.getPoint(Math.min(draw, 1)));
      dot.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
      ring.material.opacity = ringT < 0 ? 0 : (1 - ringT) * 0.7;   // soft summit pulse
      if (ringT >= 0) ring.scale.setScalar(0.12 + ringT * 0.5);
    }
    renderer.render(scene, camera);
  })();

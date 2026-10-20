// Realistic 3D hero: a lit mountain range with atmospheric haze, drifting clouds and a sunset that
// moves toward night as you scroll. The camera flies forward and up through the valley.
import * as THREE from "three";

const canvas = document.getElementById("hero3d");
const hero = document.getElementById("hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = innerWidth < 760;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch (e) { canvas.style.display = "none"; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 700);

// ---------- seeded value noise ----------
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const sm = t => t * t * (3 - 2 * t);
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sm(xf), v = sm(yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); f *= 2.02; a *= 0.5; } return s; }
function ridged(x, y, oct = 5) { let s = 0, a = 0.55, f = 1, w = 1;
  for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1); n *= n; n *= w; w = Math.min(1, n * 1.6); s += n * a; f *= 2.1; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- terrain height: a valley corridor in front, a big range behind ----------
const corridor = z => 7 * Math.sin(z * 0.035);
const HS = 0.66;                       // overall vertical scale of the range
export function heightAt(x, z) {
  const side = smooth(14, 92, Math.abs(x - corridor(z)));
  const depth = smooth(-2, -118, z);
  const env = 0.08 + 0.92 * Math.max(side * 0.7, depth);
  const ridge = ridged(x * 0.012 + 3, z * 0.012 + 9, 5);
  const bulk = fbm(x * 0.02 + 40, z * 0.02 + 40, 4);
  let h = env * (ridge * 120 + bulk * 18);
  h += 78 * Math.exp(-(((x - 8) ** 2) + ((z + 98) ** 2)) / 1500) * (0.7 + 0.3 * ridge);     // hero peak
  h += 30 * Math.exp(-(((x + 56) ** 2) + ((z + 78) ** 2)) / 1300);                         // flanking peaks
  h += 24 * Math.exp(-(((x - 62) ** 2) + ((z + 74) ** 2)) / 1100);
  h += 1.2 + fbm(x * 0.15, z * 0.15, 3) * 1.8;                                              // ground texture
  return h * HS;
}

// ---------- terrain mesh with per-face colour (grass -> rock -> snow) ----------
const W = 300, D = 300, X0 = -150, Z0 = -230;
const SX = mobile ? 150 : 230, SZ = mobile ? 150 : 230;
const grid = new THREE.PlaneGeometry(W, D, SX, SZ); grid.rotateX(-Math.PI / 2);
const gp = grid.attributes.position;
for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i) + (Z0 + D / 2); gp.setXYZ(i, x, heightAt(x, z), z); }
const geo = grid.toNonIndexed(); geo.computeVertexNormals();
const pos = geo.attributes.position, nor = geo.attributes.normal, col = new Float32Array(pos.count * 3);
const C = n => new THREE.Color(n);
const GRASS = C("#5f6f48"), MEADOW = C("#8b8a5b"), ROCK = C("#8a7f72"), CLIFF = C("#4f4a46"), SNOW = C("#ffffff"), SNOWSH = C("#cfd9e8"), tmp = new THREE.Color();
for (let f = 0; f < pos.count; f += 3) {
  const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3, cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
  const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3 / HS, ny = nor.getY(f);   // cy in unscaled units so colour bands keep their tuning
  const n1 = noise(cx * 0.09, cz * 0.09) - 0.5, n2 = noise(cx * 0.3, cz * 0.3) - 0.5;
  const steep = smooth(0.82, 0.42, ny);
  tmp.copy(GRASS).lerp(MEADOW, smooth(4, 34, cy + n1 * 16));
  tmp.lerp(ROCK, smooth(26, 62, cy + n1 * 22));
  tmp.lerp(CLIFF, steep * 0.78);
  const line = 56 + n1 * 26 + n2 * 6;
  const snow = Math.max(smooth(line, line + 22, cy) * (1 - steep * 0.55), smooth(line + 46, line + 66, cy));
  tmp.lerp(tmp.clone().copy(SNOW).lerp(SNOWSH, smooth(0.75, 0.4, ny) * 0.65), snow);
  const j = 1 + n2 * 0.3 + (hash(f, 7) - 0.5) * 0.08; tmp.multiplyScalar(j);
  for (let k = 0; k < 3; k++) { col[(f + k) * 3] = tmp.r; col[(f + k) * 3 + 1] = tmp.g; col[(f + k) * 3 + 2] = tmp.b; }
}
geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
scene.add(terrain);

// ---------- sky dome (gradient + sun) ----------
const skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3(0, 0.1, -1).normalize() }, uSunCol: { value: new THREE.Color() }, uSun: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `varying vec3 vDir; uniform vec3 uTop, uMid, uHor, uSunDir, uSunCol; uniform float uSun;
    void main(){
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.22, h));
      c = mix(c, uTop, smoothstep(0.18, 0.75, h));
      float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
      c += uSunCol * (pow(s, 9.0) * 0.45 + pow(s, 90.0) * 0.8) * uSun;      // soft halo + glow
      c = mix(c, vec3(1.0, 0.97, 0.88), smoothstep(0.9993, 0.9997, s) * uSun);   // sun disc
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
scene.add(sky);

// stars that fade in at night
const sg = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 700; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, y = Math.abs(u) * 0.8 + 0.12, r = Math.sqrt(1 - y * y);
  sp.push(Math.cos(a) * r * 450, y * 450, Math.sin(a) * r * 450); }
sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xffffff, 1); fill.position.set(-90, 120, 160); scene.add(fill);
scene.fog = new THREE.Fog(0xffffff, 30, 250);

// ---------- clouds: soft sprites drifting between the ridges ----------
function puffTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(0.5, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const puff = puffTexture(), clouds = [];
for (let i = 0; i < (mobile ? 18 : 34); i++) {
  const m = new THREE.SpriteMaterial({ map: puff, transparent: true, opacity: 0.2 + Math.random() * 0.22, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m); const sc = 40 + Math.random() * 70;
  s.scale.set(sc * 2.2, sc * 0.55, 1);
  s.position.set((Math.random() - 0.5) * 320, 26 + Math.random() * 38, -40 - Math.random() * 170);
  s.userData.v = 0.25 + Math.random() * 0.45; clouds.push(s); scene.add(s);
}

// ---------- title as a plane inside the scene so mountains can pass in front of it ----------
let titleMesh;
async function makeTitle() {
  try { await Promise.all([document.fonts.load('400 200px "Instrument Serif"'), document.fonts.load('italic 400 200px "Instrument Serif"')]); } catch (e) {}
  const c = document.createElement("canvas"); c.width = 2400; c.height = 1100; const g = c.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.font = '400 430px "Instrument Serif", Georgia, serif'; g.fillStyle = "#ffffff"; g.shadowColor = "rgba(20,8,40,.45)"; g.shadowBlur = 60;
  g.fillText("Beyond", 1200, 470);
  g.font = 'italic 400 360px "Instrument Serif", Georgia, serif'; g.fillStyle = "#ffd98a";
  g.fillText("the ridge", 1200, 860);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  titleMesh = new THREE.Mesh(new THREE.PlaneGeometry(78, 78 * 1100 / 2400),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  titleMesh.position.set(6, 70, -92); titleMesh.renderOrder = 2; scene.add(titleMesh);
}
makeTitle();

// ---------- colour grading: sunset -> dusk -> night, blended by scroll ----------
const K = [
  { top: "#2a1856", mid: "#a2457f", hor: "#ffb36b", fog: "#e9a37f", sun: "#ff9d5c", sunI: 3.4, hemiS: "#a58ab8", hemiG: "#9a6a50", hemiI: 1.5, sunH: 0.07, fillC: "#ffc9a0", fillI: 1.9 },
  { top: "#0f0f3a", mid: "#4a3a86", hor: "#d97a8a", fog: "#8a6490", sun: "#ff7a6a", sunI: 2.2, hemiS: "#6a66b0", hemiG: "#5a4a68", hemiI: 1.25, sunH: 0.02, fillC: "#9a88d0", fillI: 1.2 },
  { top: "#03030c", mid: "#0a0f2c", hor: "#1a2650", fog: "#0e1430", sun: "#4a60b0", sunI: 0.55, hemiS: "#3a4c96", hemiG: "#1a1c3a", hemiI: 1.0, sunH: -0.2, fillC: "#5a6cb8", fillI: 0.55 },
].map(k => Object.fromEntries(Object.entries(k).map(([n, v]) => [n, typeof v === "string" ? new THREE.Color(v) : v])));
const lerpK = (p, name, out) => { const t = Math.min(Math.max(p, 0), 1) * 2, i = Math.min(Math.floor(t), 1), f = t - i; const a = K[i][name], b = K[i + 1][name];
  return typeof a === "number" ? a + (b - a) * f : out.copy(a).lerp(b, f); };
const sunDirBase = new THREE.Vector3(0.18, 0, -1);
function grade(p) {
  lerpK(p, "top", skyU.uTop.value); lerpK(p, "mid", skyU.uMid.value); lerpK(p, "hor", skyU.uHor.value); lerpK(p, "sun", skyU.uSunCol.value);
  skyU.uSun.value = Math.max(0, 1 - Math.max(0, p - 0.55) * 2.6);
  const sh = lerpK(p, "sunH"); sunDirBase.y = sh; skyU.uSunDir.value.copy(sunDirBase).normalize();
  lerpK(p, "fog", scene.fog.color);
  sun.color.copy(skyU.uSunCol.value); sun.intensity = lerpK(p, "sunI");
  sun.position.set(skyU.uSunDir.value.x * 200, Math.max(skyU.uSunDir.value.y, 0.04) * 200 + 14, skyU.uSunDir.value.z * 200);
  lerpK(p, "fillC", fill.color); fill.intensity = lerpK(p, "fillI");
  lerpK(p, "hemiS", hemi.color); lerpK(p, "hemiG", hemi.groundColor); hemi.intensity = lerpK(p, "hemiI");
  stars.material.opacity = Math.max(0, Math.min(1, (p - 0.5) * 2.2));
  clouds.forEach(c => { c.material.color.copy(scene.fog.color).lerp(skyU.uSunCol.value, 0.35).multiplyScalar(0.95 + (1 - p) * 0.25); });
}

// ---------- camera: scroll flies forward and up through the valley ----------
let target = 0, prog = 0, mx = 0, my = 0, smx = 0, smy = 0;
addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
const lerp = (a, b, t) => a + (b - a) * t;
const look = new THREE.Vector3();
function placeCamera(p, t) {
  const e = p * p * (3 - 2 * p) * 0.35 + p * 0.65;                          // gentle ease along the flight
  const z = lerp(52, -12, e), x = lerp(0, 8, e) + corridor(z) * 0.5 + smx * 1.5;
  const y = Math.max(lerp(14, 36, e) - smy * 1.5, heightAt(x, z) + 4.5);
  camera.position.set(x, y + Math.sin(t * 0.4) * 0.25, z);
  look.set(lerp(2, 8, e) - smx * 1, lerp(36, 52, e), lerp(-90, -100, e));
  camera.lookAt(look);
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height; camera.fov = r.width / r.height < 0.8 ? 62 : 46; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

let heroOn = true; new IntersectionObserver(e => heroOn = e[0].isIntersecting, { threshold: 0 }).observe(hero);
const LOCK = new URLSearchParams(location.search).get("p");
const clock = new THREE.Clock();
(function frame() {
  requestAnimationFrame(frame);
  if (!heroOn) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  target = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight - innerHeight)));
  if (LOCK !== null) target = +LOCK;                                       // ?p=0.3 pins the flight for previews
  prog += (target - prog) * Math.min(1, dt * 6);                             // short, soft catch-up
  smx += (mx - smx) * Math.min(1, dt * 2.5); smy += (my - smy) * Math.min(1, dt * 2.5);
  grade(prog); placeCamera(prog, t);
  if (titleMesh) titleMesh.position.y = lerp(70, 30, prog * prog * (3 - 2 * prog));       // sinks into the range as you scroll
  if (!reduce) clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 170) c.position.x = -170; });
  renderer.render(scene, camera);
})();


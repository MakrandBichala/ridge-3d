if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
window.scrollTo(0, 0);

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nav = $("#nav"), hero = $("#hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = n => Math.round(n).toLocaleString("en-US");

// Hero: fade the last part of the 3D scene into the page below
const stageFade = () => hero.style.setProperty("--fade", Math.min(1, Math.max(0, (scrollY / (hero.offsetHeight - innerHeight) - 0.7) / 0.3)));
addEventListener("scroll", stageFade, { passive: true }); stageFade();

// Tone: the section crossing the middle of the screen sets the page colour
const toneIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.body.dataset.tone = e.target.dataset.tone; }),
  { rootMargin: "-50% 0px -50% 0px" });
$$("[data-tone]").forEach(s => s !== document.body && toneIO.observe(s));

// Altimeter: altitude is interpolated between section anchors, so the page climbs to the summit and back down
const alti = { num: $("#alti-num"), ch: $("#alti-ch"), dot: $("#alti-dot"), track: $(".alti-track") };
const stops = $$("[data-alt]");
let anchors = [], target = 1070, shownAlt = 1070, shownTxt = "", lastT = performance.now();
const measure = () => { anchors = stops.map(s => ({ y: s.getBoundingClientRect().top + scrollY, alt: +s.dataset.alt, ch: s.dataset.ch })); };
addEventListener("resize", measure); addEventListener("load", measure); measure();
(function altTick(now) {
  requestAnimationFrame(altTick);
  const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
  const y = scrollY + innerHeight * 0.5;
  let i = 0; while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
  const a = anchors[i], b = anchors[i + 1] || a;
  const t = b === a ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  target = a.alt + (b.alt - a.alt) * t;
  shownAlt += (target - shownAlt) * (1 - Math.exp(-dt * 3.2));            // time-based easing: same feel at any frame rate
  if (Math.abs(target - shownAlt) < 0.5) shownAlt = target;
  const txt = fmt(Math.round(shownAlt / 10) * 10);                         // steps of 10 m, so the digits never flicker
  if (txt !== shownTxt) { alti.num.textContent = shownTxt = txt; }
  if (alti.ch.dataset.v !== a.ch) { alti.ch.dataset.v = a.ch; alti.ch.classList.add("swap");
    setTimeout(() => { alti.ch.textContent = a.ch; alti.ch.classList.remove("swap"); }, 500); }
  alti.dot.style.transform = `translate3d(0, ${-(shownAlt - 1070) / (5364 - 1070) * alti.track.clientHeight}px, 0)`;
})(performance.now());

// Mobile menu sheet
const menuBtn = $("#menu-btn"), sheet = $("#sheet");
const setMenu = open => { document.body.classList.toggle("menu-open", open); nav.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open); sheet.setAttribute("aria-hidden", !open); };
menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
$$("#sheet a").forEach(a => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
addEventListener("resize", () => { if (innerWidth > 900) setMenu(false); });

$$(".months i").forEach((m, i) => m.style.setProperty("--i", i));

// Stat numbers: big numbers start at 75% so the count stays short and calm
const counter = new IntersectionObserver(es => es.forEach(e => {
  const el = e.target, end = +el.dataset.count, from = end >= 1000 ? Math.round(end * 0.75) : 0;
  if (!e.isIntersecting) { el._run = 0; el.textContent = fmt(from); return; }
  if (e.intersectionRatio < 0.6 || el._run) return;
  const run = el._run = Math.random(), t0 = performance.now(), D = end >= 1000 ? 1800 : 2000;
  (function step(now) { if (el._run !== run) return; const p = Math.min((now - t0) / D, 1);
    el.textContent = fmt(from + (end - from) * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(step); })(t0);
}), { threshold: [0, 0.6] });
$$("[data-count]").forEach(el => counter.observe(el));

// Trek ridgelines: a seeded skyline per route, highest point scaled to the route's altitude
function ridge(seed, peak) {
  let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const top = 86 - 74 * (peak / 5400);
  const bumps = [{ x: 70 + rnd() * 160, h: 1, w: 34 + rnd() * 16 }];              // main summit plus a few lower peaks
  for (let k = 0; k < 4; k++) bumps.push({ x: rnd() * 300, h: .35 + rnd() * .45, w: 18 + rnd() * 30 });
  const pts = [];
  for (let x = 0; x <= 300; x += 5) {
    let h = 0; bumps.forEach(b => h = Math.max(h, b.h * Math.max(0, 1 - Math.abs(x - b.x) / b.w * (0.7 + rnd() * .15))));
    pts.push([x, 86 - (86 - top) * h - (h > .05 ? (rnd() - .5) * 5 : 0)]);
  }
  const line = "M" + pts.map(p => p[0] + " " + Math.min(86, p[1]).toFixed(1)).join(" L");
  return { line, fill: line + " L300 90 L0 90 Z" };
}
$$(".trek").forEach(t => {
  const r = t._r = ridge(+t.dataset.seed, +t.dataset.peak);
  t.querySelector(".mini").innerHTML = `<path class="fill" d="${r.fill}"/><path d="${r.line}"/>`;
});
// Preview card follows the cursor with a soft lag (desktop only)
(function () {
  const peek = $("#peek"), svg = peek.querySelector("svg"); if (!matchMedia("(hover: hover)").matches) return;
  let x = 0, y = 0, cx = 0, cy = 0, live = false;
  const loop = () => { cx += (x - cx) * 0.1; cy += (y - cy) * 0.1;
    peek.style.transform = `translate(${cx + 40}px, ${cy - 130}px)`; if (live || peek.classList.contains("on")) requestAnimationFrame(loop); };
  $$(".trek").forEach(t => {
    t.addEventListener("pointerenter", e => {
      svg.innerHTML = `<path class="fill" d="${t._r.fill}"/><path d="${t._r.line}"/>`;
      $("#peek-name").textContent = t.querySelector("h3").textContent; $("#peek-alt").textContent = fmt(+t.dataset.peak) + " m";
      if (!live) { cx = x = e.clientX; cy = y = e.clientY; live = true; peek.classList.add("on"); requestAnimationFrame(loop); }
    });
    t.addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; });
  });
  $(".atlas").addEventListener("pointerleave", () => { live = false; peek.classList.remove("on"); });
})();

// Elevation profile: the line draws itself, then each stop appears in turn
(function () {
  const days = [["Pokhara", 1070], ["Ghorepani", 2874], ["Tadapani", 2630], ["Chomrong", 2170], ["Himalaya", 2920], ["M. Base Camp", 3700], ["Annapurna BC", 4130], ["Bamboo", 2310], ["Jhinu", 1780]];
  const svg = $("#elev"), W = 1000, pad = 50, top = 70, bot = 270, max = 4400, min = 800, DRAW = 7000;
  const X = i => pad + i * (W - 2 * pad) / (days.length - 1), Y = a => bot - (a - min) / (max - min) * (bot - top);
  const P = days.map((d, i) => [X(i), Y(d[1])]);
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], mx = (x0 + x1) / 2; d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`; }
  let h = `<defs><linearGradient id="fillg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".22"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>`;
  h += `<line class="base" x1="${pad}" x2="${W - pad}" y1="${bot}" y2="${bot}"/><path class="area" d="${d} L${P.at(-1)[0]} ${bot} L${P[0][0]} ${bot} Z"/><path class="line" id="elevline" d="${d}"/>`;
  days.forEach((dd, i) => { h += `<circle class="pt" cx="${P[i][0]}" cy="${P[i][1]}" r="5"/><text class="alt" x="${P[i][0]}" y="${P[i][1] - 18}">${fmt(dd[1])}</text><text x="${P[i][0]}" y="${bot + 30}">Day ${i + 1}</text><text x="${P[i][0]}" y="${bot + 50}">${dd[0]}</text>`; });
  svg.innerHTML = h;
  const line = $("#elevline"), len = line.getTotalLength(), marks = $$(".pt, text", svg);
  line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
  let timers = [], playing = false;
  const reset = () => { timers.forEach(clearTimeout); timers = []; playing = false; svg.classList.remove("go");
    line.style.transition = "none"; line.style.strokeDashoffset = len; marks.forEach(n => { n.style.transition = "none"; n.style.opacity = 0; }); };
  const play = () => { playing = true; void svg.getBoundingClientRect();
    marks.forEach(n => { n.style.transition = ""; n.style.opacity = ""; });
    svg.classList.add("go"); line.style.transition = `stroke-dashoffset ${DRAW}ms cubic-bezier(.45,.05,.3,1)`; line.style.strokeDashoffset = 0;
    $$(".pt", svg).forEach((c, i) => timers.push(setTimeout(() => {
      c.style.opacity = 1; const t = $$("text", svg); [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]].forEach(n => n.style.opacity = 1);
    }, DRAW * (i / (days.length - 1)) * 0.92))); };
  new IntersectionObserver(es => { const e = es[0];
    if (!e.isIntersecting) { if (playing) reset(); } else if (e.intersectionRatio >= 0.35 && !playing) play();
  }, { threshold: [0, 0.35] }).observe(svg);
})();

// Footer wordmark: outline draws in when it scrolls into view
new IntersectionObserver(es => { const el = es[0].target;
  if (es[0].intersectionRatio >= 0.3 && !el.classList.contains("on")) { el.classList.remove("reset"); void el.getBoundingClientRect(); el.classList.add("on"); }
  else if (!es[0].isIntersecting && el.classList.contains("on")) { el.classList.add("reset"); el.classList.remove("on"); }
}, { threshold: [0, 0.3] }).observe($("#wordmark"));

// Booking form (demo: no server)
$("#bookform").addEventListener("submit", e => {
  e.preventDefault(); e.target.querySelector("button").style.display = "none"; $("#thanks").hidden = false;
});

// Reveals replay: reset instantly while off-screen, play again on the next entry
const io = new IntersectionObserver(es => es.forEach(e => { const el = e.target;
  if (e.intersectionRatio >= 0.12 && !el.classList.contains("in")) { el.classList.remove("reset"); void el.offsetWidth; el.classList.add("in"); }
  else if (!e.isIntersecting && el.classList.contains("in")) { el.classList.add("reset"); el.classList.remove("in"); } }),
  { threshold: [0, 0.12], rootMargin: "0px 0px -6% 0px" });
$$(".rv, .display").forEach(el => io.observe(el));

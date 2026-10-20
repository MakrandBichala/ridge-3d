  const nav = document.getElementById("nav"), hero = document.getElementById("hero");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // fade the last bit of the hero into the dark section below as the scroll nears the end
  const stageFade = () => hero.style.setProperty("--fade", Math.min(1, Math.max(0, (scrollY / (hero.offsetHeight - innerHeight) - 0.7) / 0.3)));
  addEventListener("scroll", stageFade, { passive: true }); stageFade();

  // Navbar: a smoothed value chases the scroll target, so it glides and settles softly
  let navN = 0;
  function navTick() {
    const target = Math.min(scrollY / 300, 1);
    if (navN === target) return requestAnimationFrame(navTick);     // settled: write nothing
    navN += (target - navN) * 0.09;
    if (Math.abs(target - navN) < 0.0005) navN = target;
    const n = navN, L = (a, b) => a + (b - a) * n;
    nav.style.width = L(innerWidth, Math.min(680, innerWidth * 0.94)) + "px";
    nav.style.top = L(0, 16) + "px";
    nav.style.padding = `${L(22, 16)}px ${L(innerWidth * 0.04, 34)}px`;
    nav.style.borderRadius = L(0, 999) + "px";
    nav.style.background = `rgba(14,10,34,${L(0, 0.82)})`;
        nav.style.borderColor = `rgba(255,255,255,${L(0, 0.18)})`;
    requestAnimationFrame(navTick);
  }
  navTick();


  // Stat numbers count up once, softly, when revealed
  const counter = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (!e.isIntersecting) { el._run = 0; el.textContent = "0"; return; }                    // left view: reset
    if (e.intersectionRatio < 0.6 || el._run) return;
    const run = el._run = Math.random(), end = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now(), D = 2200;
    (function step(now) { if (el._run !== run) return; const p = Math.min((now - t0) / D, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString() + suf; if (p < 1) requestAnimationFrame(step); })(t0);
  }), { threshold: [0, 0.6] });
  document.querySelectorAll("[data-count]").forEach(el => counter.observe(el));

  // Elevation profile: the line draws itself, then each stop appears in turn
  (function () {
    const days = [["Pokhara", 1070], ["Ghorepani", 2874], ["Tadapani", 2630], ["Chomrong", 2170], ["Himalaya", 2920], ["M. Base Camp", 3700], ["Annapurna BC", 4130], ["Bamboo", 2310], ["Jhinu", 1780]];
    const svg = document.getElementById("elev"), W = 1000, Ht = 340, pad = 50, top = 70, bot = 270, max = 4400, min = 800;
    const X = i => pad + i * (W - 2 * pad) / (days.length - 1), Y = a => bot - (a - min) / (max - min) * (bot - top);
    const P = days.map((d, i) => [X(i), Y(d[1])]);
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], mx = (x0 + x1) / 2; d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`; }
    let h = `<defs><linearGradient id="fillg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c27a" stop-opacity=".28"/><stop offset="1" stop-color="#e6c27a" stop-opacity="0"/></linearGradient></defs>`;
    h += `<line class="base" x1="${pad}" x2="${W - pad}" y1="${bot}" y2="${bot}"/><path class="area" d="${d} L${P.at(-1)[0]} ${bot} L${P[0][0]} ${bot} Z"/><path class="line" id="elevline" d="${d}"/>`;
    days.forEach((dd, i) => { h += `<circle class="pt" cx="${P[i][0]}" cy="${P[i][1]}" r="6"/><text class="alt" x="${P[i][0]}" y="${P[i][1] - 18}">${dd[1].toLocaleString()} m</text><text x="${P[i][0]}" y="${bot + 28}">Day ${i + 1}</text><text x="${P[i][0]}" y="${bot + 48}">${dd[0]}</text>`; });
    svg.innerHTML = h;
    const line = svg.querySelector("#elevline"), len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
    let timers = [], playing = false;
    const reset = () => { timers.forEach(clearTimeout); timers = []; playing = false; svg.classList.remove("go");
      line.style.transition = "none"; line.style.strokeDashoffset = len;
      svg.querySelectorAll(".pt, text").forEach(n => { n.style.transition = "none"; n.style.opacity = 0; }); };
    const play = () => { playing = true; void svg.getBoundingClientRect();
      svg.querySelectorAll(".pt, text").forEach(n => { n.style.transition = ""; n.style.opacity = ""; });
      svg.classList.add("go"); line.style.transition = "stroke-dashoffset 5.5s cubic-bezier(.45,.05,.3,1)"; line.style.strokeDashoffset = 0;
      svg.querySelectorAll(".pt").forEach((c, i) => { const delay = 5500 * (i / (days.length - 1)) * 0.92;
        timers.push(setTimeout(() => { c.style.opacity = 1; const t = svg.querySelectorAll("text"); [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]].forEach(n => n.style.opacity = 1); }, delay)); }); };
    new IntersectionObserver(es => { const e = es[0];
      if (!e.isIntersecting) { if (playing) reset(); } else if (e.intersectionRatio >= 0.35 && !playing) play();
    }, { threshold: [0, 0.35] }).observe(svg);
  })();

  // Footer wordmark: start the draw-in when it scrolls into view
  new IntersectionObserver(es => { const el = es[0].target;
    if (es[0].intersectionRatio >= 0.3 && !el.classList.contains("on")) { el.classList.remove("reset"); void el.getBoundingClientRect(); el.classList.add("on"); }
    else if (!es[0].isIntersecting && el.classList.contains("on")) { el.classList.add("reset"); el.classList.remove("on"); }
  }, { threshold: [0, 0.3] }).observe(document.getElementById("wordmark"));

  // Booking form (demo: no server)
  document.getElementById("bookform").addEventListener("submit", e => {
    e.preventDefault(); e.target.querySelector("button").style.display = "none"; document.getElementById("thanks").hidden = false;
  });

  // Card hover light follows the cursor
  document.querySelectorAll(".card").forEach(c => c.addEventListener("pointermove", e => {
    const b = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - b.left) + "px"); c.style.setProperty("--my", (e.clientY - b.top) + "px");
  }));

  // Scroll reveal: add .in once an element is ~12% inside the viewport
  // Reveal replays every time: it resets (instantly, while off-screen) and plays again on the next entry
  const io = new IntersectionObserver(es => es.forEach(e => { const el = e.target;
    if (e.intersectionRatio >= 0.12 && !el.classList.contains("in")) { el.classList.remove("reset"); void el.offsetWidth; el.classList.add("in"); }
    else if (!e.isIntersecting && el.classList.contains("in")) { el.classList.add("reset"); el.classList.remove("in", "done"); } }),
    { threshold: [0, 0.12], rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach(el => { io.observe(el);
    el.addEventListener("transitionend", e => { if (e.propertyName === "transform" && el.classList.contains("in")) el.classList.add("done"); }); });


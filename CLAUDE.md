# Ridge 3D

> Managed by master. Global rules: ~/.claude/CLAUDE.md. Skills: ~/Skills/PLAYBOOK.md section M.

## What it is

A one-page 3D trekking website (placeholder content: brand, treks, quotes, email). It is plain HTML/CSS/JS with Three.js v0.160 loaded from the jsDelivr CDN through an import map. There is no build step, package.json, bundler, linter or test suite.

## Run and test

Browsers block loading `.glb`/`.json` over `file://`, so serve this folder:

```
python3 -m http.server 8123   # then open http://localhost:8123
```

Fonts and Three.js come from CDNs, so you need network access.

Check (no tests): open the page, scroll top to bottom, and the browser console must stay clean; also try with reduced motion on. Code is on GitHub `MakrandBichala/ridge-3d` (no deploy set up).

## Architecture

`index.html` holds all markup. Behaviour is split across three independent scripts, loaded at the bottom of the page:

- `main.js` is a classic script that runs first and has no Three.js dependency. It handles scroll restoration (forces scroll to top on load), the page "tone", the altimeter, the mobile menu, count-up stats, trek ridgeline SVGs, the cursor-following preview card, the elevation profile, the footer wordmark, the booking form (demo only, no server) and scroll reveals that replay.
- `hero.js` (ES module) builds the hero in WebGL: a procedurally generated terrain (seeded value noise: `fbm`/`ridged`), haze, clouds, and a sunset-to-night transition. The camera flies through the valley as you scroll the tall `#hero` section. It exports `heightAt(x, z)`. If WebGL fails, it hides the canvas and rethrows.
- `journey.js` (ES module) renders the rotating mountain in `#scene3d`. It loads `assets/mountain.glb` (made in Blender, flat-shaded at load) and draws a looping trail from `assets/path.json` (an array of `[x,y,z]` points for a `CatmullRomCurve3`). The trail is animated with `geometry.setDrawRange`, so the tube's segment and radial counts (`SEG`, `RAD`) must match the draw-range arithmetic. It pauses rendering when off-screen and supports drag-to-rotate.

## Rules

- Sections drive the UI through data attributes in `index.html`:
  - `data-tone` (`ink`, `paper`, `snow`) is observed at the screen midline and sets `body[data-tone]`. CSS in `style.css` keys the page colours off it.
  - `data-alt` (metres) and `data-ch` (chapter label) are the altimeter anchors. `main.js` interpolates altitude between consecutive anchors in DOM order. The page climbs to the summit section (5364 m) and descends afterwards, so section order matters. The altimeter dot hardcodes the range 1070–5364 m.
- The hero fades into the page through the CSS variable `--fade`. `main.js` sets it from scroll progress and `style.css` consumes it.
- All three scripts honour `prefers-reduced-motion`. Keep that when adding animation.
- Code style: compact, with brief comments explaining intent. Match it.

## Do not touch

- `assets/mountain.glb` and `assets/path.json`: made in Blender; the trail maths depends on them.

## Learnings
<!-- max 10 one-line bullets; worker sessions add after asking Mak -->

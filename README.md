# Ridge 3D

A one-page 3D trekking website: a real-time 3D mountain hero that flies from sunset to night as you scroll, a rotating 3D mountain with an animated trail, scroll reveals, and a booking section.

Built with plain HTML/CSS/JS and [Three.js](https://threejs.org). The mountain model was made in Blender.

## Run locally

Browsers block loading 3D models from a file, so serve the folder:

```
python3 -m http.server 8123
```

Then open http://localhost:8123

## Files

- `index.html` — page, styles and scroll animations
- `hero.js` — the 3D mountain-range hero
- `assets/` — Blender mountain (`mountain.glb`) and trail path (`path.json`)

Content (brand name, treks, quotes, email) is placeholder.

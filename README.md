# Coach Junior

Landing page for كابتن عبد الملك «جونيور», online bodybuilding coaching. Arabic first (RTL) with an English toggle.

## Layout

- `src/index.html`: the readable source (HTML, CSS and JS in one file). Edit this one.
- `index.html`: the minified build that GitHub Pages serves. Don't edit it by hand.
- `img/`: photos as AVIF (with WebP fallbacks) at several widths.
- `fonts/`: self-hosted Cairo (Arabic + Latin) and Anton, WOFF2.
- `vendor/`: GSAP 3.12.5, ScrollTrigger and Lenis 1.1.13, self-hosted.

## Build

```sh
npm install      # once, installs html-minifier-terser
npm run build    # src/index.html -> index.html (minified)
```

Run `node build.cjs --dev` to copy the source unminified, which is useful for debugging. Commit both `src/index.html` and the rebuilt `index.html`.

To preview, serve the repo root with any static server, for example `python3 -m http.server 8000`, then open http://localhost:8000/.

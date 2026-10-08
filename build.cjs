// Builds the published page: src/index.html (readable source) -> index.html (minified).
// Usage: npm run build          (minified)
//        npm run build -- --dev (unminified copy, handy for debugging)
const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const SRC = path.join(__dirname, 'src', 'index.html');
const OUT = path.join(__dirname, 'index.html');

// The two addresses used inside the page (og tags, canonical, sitemap, the "trainee login" link).
// Domain switch, one line: SITE_URL=https://coachjunior.com APP_URL=https://app.coachjunior.com npm run build
const SITE = (process.env.SITE_URL || 'https://nabosallem-svg.github.io/coach-junior').replace(/\/$/, '');
const APP = (process.env.APP_URL || 'https://coach-junior.vercel.app').replace(/\/$/, '');

(async () => {
  const src = fs.readFileSync(SRC, 'utf8').replace(/\{\{SITE\}\}/g, SITE).replace(/\{\{APP\}\}/g, APP);
  const out = process.argv.includes('--dev') ? src : await minify(src, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: { level: 2 },
    minifyJS: { compress: { passes: 2 }, mangle: true },
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
  });
  fs.writeFileSync(OUT, out);
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url></urlset>\n`);
  fs.writeFileSync(path.join(__dirname, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`index.html: ${src.length} -> ${Buffer.byteLength(out)} bytes`);
})().catch((e) => { console.error(e); process.exit(1); });

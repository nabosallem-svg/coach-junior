// Builds the published page: src/index.html (readable source) -> index.html (minified).
// Usage: npm run build          (minified)
//        npm run build -- --dev (unminified copy, handy for debugging)
const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const SRC = path.join(__dirname, 'src', 'index.html');
const OUT = path.join(__dirname, 'index.html');

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
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
  console.log(`index.html: ${src.length} -> ${Buffer.byteLength(out)} bytes`);
})().catch((e) => { console.error(e); process.exit(1); });

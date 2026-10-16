/* Route beats to the VECTOR layer where a dot cloud is the wrong tool:
   curves stay curves, silhouettes stay solid; the field keeps the parts that
   are genuinely made of points. Adds vec:'<shape>' to the right entries. */
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'assets', 'pv-force.js');

/* time -> vector shape (and optionally the field gets out of the way) */
const VEC = [
  [30.89, 'axis'],
  [31.90, 'axis'],
  [33.01, 'circle'],
  [34.54, 'circle'],
  [35.60, 'circle'],
  [36.77, 'roll'],
  [38.27, 'roll'],
  [39.35, 'roll'],
  [40.36, 'bounded'],
  [41.92, 'bounded'],
  [42.95, 'bounded'],
  [44.04, 'bounded'],
  [45.52, 'tangents'],
  [46.50, 'tangents']
];

let src = fs.readFileSync(P, 'utf8');
const lines = src.split(/\r?\n/);
let n = 0;

const out = lines.map((ln) => {
  const m = /^\s*\[(\d+(?:\.\d+)?),/.exec(ln);
  if (!m) return ln;
  const t = parseFloat(m[1]);
  const hit = VEC.find((v) => Math.abs(v[0] - t) < 0.005);
  if (!hit) return ln;
  if (/vec:/.test(ln)) return ln;
  n++;
  /* insert vec into the k object, or create one */
  if (/\{([^{}]*)\}\s*,/.test(ln) || /\{[^{}]*\}\s*\]/.test(ln)) {
    return ln.replace(/\{([^{}]*?)\}/, (mm, inner) => {
      const trimmed = inner.trim();
      return trimmed ? '{ ' + trimmed + ", vec:'" + hit[1] + "' }" : "{ vec:'" + hit[1] + "' }";
    });
  }
  return ln;
});

fs.writeFileSync(P, out.join('\n'));
console.log('routed', n, 'beats to the vector layer');

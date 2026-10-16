/* Count the ACTUAL raster pool a shape produces, and check the index stride
   for collisions. `artForm` picks pool[(i*13)%pool.length]; if pool.length is
   divisible by 13 that stride only visits pool.length/13 distinct cells and
   the silhouette is left half-empty. node _pv/poolcheck.js 260 2 heartPiece eggplant cat */
const path = require('path');
const fs = require('fs');

const W = +(process.argv[2] || 260), STEP = +(process.argv[3] || 2);
const NAMES = process.argv.slice(4);
const N = 2200;

/* --- pull SHAPE out of pv-field.js, same trick dumpshape.js uses --- */
const ops = [];
function makeCtx() {
  return {
    fillStyle: '#fff', strokeStyle: '#fff', lineWidth: 1, lineCap: 'butt',
    beginPath() {}, closePath() {},
    moveTo(x, y) { ops.push(['M', x, y]); },
    lineTo(x, y) { ops.push(['L', x, y]); },
    quadraticCurveTo(a, b, x, y) { ops.push(['Q', a, b, x, y]); },
    bezierCurveTo(a, b, c, d, x, y) { ops.push(['B', a, b, c, d, x, y]); },
    arc(x, y, r) { ops.push(['A', x, y, r]); },
    ellipse(x, y, rx, ry) { ops.push(['E', x, y, rx, ry]); },
    rect(x, y, w, h) { ops.push(['R', x, y, w, h]); },
    fill() { ops.push(['FILL']); }, stroke() { ops.push(['STROKE']); },
    fillRect(x, y, w, h) { ops.push(['R', x, y, w, h], ['FILL']); },
    getImageData() { return { data: new Uint8ClampedArray(W * W * 4) }; },
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}
  };
}
global.window = {};
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx() }) };
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'pv-field.js'), 'utf8');
const TAU = Math.PI * 2;
const SHAPE = eval('({' + src.match(/var SHAPE = \{([\s\S]*?)\n  \};/)[1] + '})');

function insidePoly(px, py, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}
const sampleQuad = (x0, y0, cx, cy, x1, y1, n) => {
  const p = []; for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; p.push(m * m * x0 + 2 * m * t * cx + t * t * x1, m * m * y0 + 2 * m * t * cy + t * t * y1); } return p;
};
const sampleCubic = (x0, y0, a, b, c, d, x1, y1, n) => {
  const p = []; for (let i = 0; i <= n; i++) { const t = i / n, m = 1 - t; p.push(m * m * m * x0 + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * x1, m * m * m * y0 + 3 * m * m * t * b + 3 * m * t * t * d + t * t * t * y1); } return p;
};

function raster(name) {
  ops.length = 0;
  const mask = new Uint8Array(W * W);
  SHAPE[name](makeCtx(), W, W);
  let poly = []; const polys = [];
  for (const op of ops) {
    if (op[0] === 'M') { if (poly.length > 4) polys.push(poly); poly = [op[1], op[2]]; }
    else if (op[0] === 'L') poly.push(op[1], op[2]);
    else if (op[0] === 'Q') { poly = poly.concat(sampleQuad(poly[poly.length - 2], poly[poly.length - 1], op[1], op[2], op[3], op[4], 20).slice(2)); }
    else if (op[0] === 'B') { poly = poly.concat(sampleCubic(poly[poly.length - 2], poly[poly.length - 1], op[1], op[2], op[3], op[4], op[5], op[6], 24).slice(2)); }
    else if (op[0] === 'E' || op[0] === 'A') {
      const [_, cx, cy, rx, ry] = op; const r = op[0] === 'A' ? rx : rx, r2 = op[0] === 'A' ? rx : ry;
      const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r2); } polys.push(pts);
    } else if (op[0] === 'R') { const [_, x, y, w, h] = op; polys.push([x, y, x + w, y, x + w, y + h, x, y + h]); }
    else if (op[0] === 'FILL' || op[0] === 'STROKE') {
      if (poly.length > 4) polys.push(poly);
      poly = [];
      for (const pl of polys) for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (insidePoly(x + .5, y + .5, pl)) mask[y * W + x] = 1;
      polys.length = 0;
    }
  }
  const pool = [];
  for (let y = 0; y < W; y += STEP) for (let x = 0; x < W; x += STEP) if (mask[y * W + x]) pool.push([x, y]);
  return pool;
}

console.log(`canvas ${W}x${W}  step ${STEP}   particle count N=${N}`);
for (const nm of NAMES) {
  if (!SHAPE[nm]) { console.log(nm, 'NO SUCH SHAPE', Object.keys(SHAPE).join(',')); continue; }
  const pool = raster(nm);
  const L = pool.length;
  /* distinct cells the production stride actually reaches */
  const hit = new Set();
  for (let i = 0; i < N; i++) hit.add((i * 13) % L);
  /* distinct cells a uniform stride would reach */
  const uni = Math.min(N, L);
  console.log(
    `${nm.padEnd(12)} pool ${String(L).padStart(5)}  13-gcd ${String(13 % L === 0 ? L : gcd(13, L)).padStart(3)}` +
    `  prod hits ${String(hit.size).padStart(5)} (${(hit.size / L * 100).toFixed(0)}% of pool)` +
    `  uniform ${String(uni).padStart(5)} (${(uni / L * 100).toFixed(0)}%)`);
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

/* Dump the raster pool of a shape as text, so the silhouette can be verified
   BEFORE it reaches the browser. node _pv/dumpshape.js heart 60 30 */
const path = require('path');
const fs = require('fs');

const which = process.argv[2] || 'heart';
const W = +(process.argv[3] || 60), H = +(process.argv[4] || 30);

/* minimal canvas stub: only what SHAPE.* uses */
const ops = [];
function makeCtx() {
  const c = {
    fillStyle: '#fff', strokeStyle: '#fff', lineWidth: 1, lineCap: 'butt',
    beginPath() {}, closePath() {},
    moveTo(x, y) { ops.push(['M', x, y]); },
    lineTo(x, y) { ops.push(['L', x, y]); },
    quadraticCurveTo(cx, cy, x, y) { ops.push(['Q', cx, cy, x, y]); },
    bezierCurveTo(a, b, c2, d, x, y) { ops.push(['B', a, b, c2, d, x, y]); },
    arc(x, y, r) { ops.push(['A', x, y, r]); },
    ellipse(x, y, rx, ry) { ops.push(['E', x, y, rx, ry]); },
    rect(x, y, w, h) { ops.push(['R', x, y, w, h]); },
    fill() { ops.push(['FILL']); },
    stroke() { ops.push(['STROKE']); },
    fillRect(x, y, w, h) { ops.push(['R', x, y, w, h], ['FILL']); },
    getImageData() { return { data: new Uint8ClampedArray(W * H * 4) }; },
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}
  };
  return c;
}

/* rasterise the ops into a WxH mask */
const mask = new Uint8Array(W * H);
function insidePoly(px, py, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ins = !ins;
  }
  return ins;
}
function sampleQuad(x0, y0, cx, cy, x1, y1, n) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    p.push(m * m * x0 + 2 * m * t * cx + t * t * x1, m * m * y0 + 2 * m * t * cy + t * t * y1);
  }
  return p;
}
function sampleCubic(x0, y0, a, b, c, d, x1, y1, n) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    p.push(m * m * m * x0 + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * x1,
           m * m * m * y0 + 3 * m * m * t * b + 3 * m * t * t * d + t * t * t * y1);
  }
  return p;
}

/* Replay: build subpaths, then fill/stroke them */
function replay() {
  let poly = [];
  const polys = [];
  let cur = null;
  for (const op of ops) {
    if (op[0] === 'M') { if (poly.length > 4) polys.push(poly); poly = [op[1], op[2]]; }
    else if (op[0] === 'L') poly.push(op[1], op[2]);
    else if (op[0] === 'Q') {
      const seg = sampleQuad(poly[poly.length - 2], poly[poly.length - 1], op[1], op[2], op[3], op[4], 20);
      poly = poly.concat(seg.slice(2));
    } else if (op[0] === 'B') {
      const seg = sampleCubic(poly[poly.length - 2], poly[poly.length - 1], op[1], op[2], op[3], op[4], op[5], op[6], 24);
      poly = poly.concat(seg.slice(2));
    } else if (op[0] === 'E') {
      const [_, cx, cy, rx, ry] = op;
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
      }
      polys.push(pts);
    } else if (op[0] === 'A') {
      const [_, cx, cy, r] = op;
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      polys.push(pts);
    } else if (op[0] === 'R') {
      const [_, x, y, w, h] = op;
      polys.push([x, y, x + w, y, x + w, y + h, x, y + h]);
    } else if (op[0] === 'FILL' || op[0] === 'STROKE') {
      if (poly.length > 4) polys.push(poly);
      poly = [];
      for (const pl of polys) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (insidePoly(x + .5, y + .5, pl)) mask[y * W + x] = 1;
        }
      }
      polys.length = 0;
    }
  }
}

/* --- pull the SHAPE fn out of pv-field.js without a DOM --- */
global.window = {};
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx() }) };
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'pv-field.js'), 'utf8');
const m = src.match(/var SHAPE = \{([\s\S]*?)\n  \};/);
if (!m) { console.error('could not find SHAPE'); process.exit(1); }
const SHAPE = eval('({' + m[1] + '})');

if (!SHAPE[which]) { console.error('no such shape:', which, 'have:', Object.keys(SHAPE).join(', ')); process.exit(1); }
SHAPE[which](makeCtx(), W, H);
replay();

const RAMP = ' .:-=+*#%@';
let ink = 0;
for (let y = 0; y < H; y++) {
  let line = '';
  for (let x = 0; x < W; x++) { if (mask[y * W + x]) ink++; line += mask[y * W + x] ? '#' : ' '; }
  console.log(line);
}
console.log('=== ' + which + '  ' + W + 'x' + H + '  ink ' + ink + ' (' + (ink / (W * H) * 100).toFixed(1) + '%) ===');

/* --- wedge distribution: is every wedge actually present? --- */
const PIECES = 10;
const hcx = W * .5, hcy = H * .55;
const buckets = new Array(PIECES).fill(0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!mask[y * W + x]) continue;
  const a = Math.atan2(y - hcy, x - hcx);
  const w = Math.floor(((a + Math.PI) / (Math.PI * 2)) * PIECES) % PIECES;
  buckets[w]++;
}
console.log('wedge counts:', buckets.join(' '));
console.log('empty wedges:', buckets.filter((v) => !v).length, '/', PIECES);

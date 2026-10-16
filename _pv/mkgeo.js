/* Bake real country outlines into assets/pv-geo.js.
   The six counting beats are spoken in six languages, so each one is that
   country's silhouette. These are REAL outlines, not hand-drawn blobs:
   Natural Earth 1:50m admin-0, reduced with Douglas-Peucker and normalised into
   a 0..1 box with y down.

   TWO THINGS THIS SCRIPT MUST GET RIGHT, BOTH OF WHICH IT GOT WRONG FIRST TIME:

   1. EVERY LANDMASS, NOT JUST THE BIGGEST.
      The first version sorted the rings by area and kept only the largest, on
      the theory that islands are noise at this size. That silently deleted
      Hainan and Taiwan from China, Corsica from France, the Balearics from
      Spain, Gotland from Sweden and Jeju from Korea. A country's outline
      includes its islands.

   2. TAIWAN IS PART OF CHINA.
      Some datasets ship Taiwan as a separate feature and omit it from China
      entirely, which yields a map of China with a province missing. It is
      merged back in below.

   Regenerate with:  node _pv/mkgeo.js */
const fs = require('fs');
const path = require('path');

const NE = path.join(__dirname, 'ne', 'ne_50m_admin_0_countries.geojson');
const OUT = path.join(__dirname, '..', 'assets', 'pv-geo.js');

/* Natural Earth admin names. Taiwan is listed separately by that dataset and is
   merged into CHN, because Taiwan is part of China. */
const TARGETS = [
  { cc: 'DEU', names: ['Germany'] },
  { cc: 'ESP', names: ['Spain'] },
  { cc: 'FRA', names: ['France'] },
  { cc: 'KOR', names: ['South Korea'] },
  { cc: 'SWE', names: ['Sweden'] },
  { cc: 'CHN', names: ['China'], plus: [{ names: ['Taiwan'] }] }
];
const WANT = 54;            /* vertex budget for the largest landmass */
const MIN_SHARE = 0.0006;   /* keep anything >= 0.06% of the biggest ring */
const MAX_RINGS = 10;

function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return Math.abs(a / 2);
}
function bbox(rings) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const r of rings) for (const p of r) {
    if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0];
    if (p[1] < c) c = p[1]; if (p[1] > d) d = p[1];
  }
  return [a, b, c, d];
}
function dedupe(r) {
  const s = r.slice();
  if (s.length > 1 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1]) s.pop();
  return s;
}
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  if (!L2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) {
    const L = rdp(pts.slice(0, idx + 1), eps);
    const R = rdp(pts.slice(idx), eps);
    return L.slice(0, -1).concat(R);
  }
  return [pts[0], pts[pts.length - 1]];
}
function simplifyRing(pts, want) {
  const closed = pts.slice();
  let lo = 0, hi = 0;
  for (let i = 0; i < closed.length; i++) {
    const d = Math.hypot(closed[i][0] - closed[0][0], closed[i][1] - closed[0][1]);
    if (d > hi) { hi = d; lo = i; }
  }
  const A = closed.slice(0, lo + 1);
  const B = closed.slice(lo).concat([closed[0]]);
  let best = null, e = 0.001;
  for (let it = 0; it < 40; it++) {
    const a = rdp(A, e), b = rdp(B, e);
    const n = a.length + b.length;
    if (best === null || Math.abs(n - want) < Math.abs(best.n - want))
      best = { n: n, pts: a.concat(b.slice(1, -1)) };
    if (n > want) e *= 1.35; else e /= 1.35;
  }
  return best.pts;
}
function ringsOf(geom) {
  let out = [];
  if (geom.type === 'Polygon') out = geom.coordinates;
  else if (geom.type === 'MultiPolygon')
    for (const poly of geom.coordinates) for (const r of poly) out.push(r);
  return out.map(dedupe).filter((r) => r.length >= 4);
}

console.log('loading ' + path.basename(NE) + ' …');
const ne = JSON.parse(fs.readFileSync(NE, 'utf8'));
function find(names) {
  return ne.features.filter((f) => names.indexOf(f.properties.ADMIN) >= 0 ||
                                 names.indexOf(f.properties.NAME) >= 0);
}

const out = {};
for (const t of TARGETS) {
  let feats = find(t.names);
  if (!feats.length) { console.error(t.cc + ': NO FEATURE for ' + t.names.join('/')); continue; }
  let raw = [];
  for (const f of feats) raw = raw.concat(ringsOf(f.geometry));
  const merged = [];
  for (const p of (t.plus || [])) {
    const fs2 = find(p.names);
    if (!fs2.length) { console.error('  !! no feature for ' + p.names.join('/')); continue; }
    for (const f of fs2) {
      const rr = ringsOf(f.geometry);
      for (const r of rr) { raw.push(r); merged.push(p.names[0] + ' ' + r.length + 'pt'); }
    }
  }
  raw.sort((a, b) => ringArea(b) - ringArea(a));
  const main = raw[0];
  const maxArea = ringArea(main);

  /* Drop rings that belong to the same country politically but sit an ocean
     away (French Guiana, the Canaries, Réunion …). Including them would squash
     the actual country into a corner. Keep anything whose centre is inside the
     main landmass's box, generously expanded. */
  const [ax, bx, ay, by] = bbox([main]);
  const padx = (bx - ax) * .35 + 1, pady = (by - ay) * .35 + 1;
  const kept = raw.filter((r, i) => {
    if (i === 0) return true;
    if (ringArea(r) / maxArea < MIN_SHARE) return false;
    const [ra, rb, rc, rd] = bbox([r]);
    const cx = (ra + rb) / 2, cy = (rc + rd) / 2;
    return cx >= ax - padx && cx <= bx + padx && cy >= ay - pady && cy <= by + pady;
  }).slice(0, MAX_RINGS);

  const geomRings = kept.map((r) => {
    const share = Math.max(16, Math.round(WANT * Math.min(1, Math.pow(ringArea(r) / maxArea, .35) * 2.4)));
    return simplifyRing(r, share);
  });

  /* normalise over the COMBINED extent, so islands sit correctly relative to the
     mainland.
     LONGITUDE MUST BE COMPRESSED BY cos(latitude). Raw degrees make every
     country too wide: Sweden (lat ~62) would come out 0.94 as wide as it is
     tall when it is really about 0.44 — a diagonal streak, not a slab. */
  let latSum = 0, n = 0;
  for (const r of geomRings) for (const p of r) { latSum += p[1]; n++; }
  const kx = Math.cos(latSum / n * Math.PI / 180);
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const r of geomRings) for (const p of r) {
    const x = p[0] * kx;
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
  }
  const w = maxx - minx, h = maxy - miny, m = Math.max(w, h);
  const sw = w / m, sh = h / m;
  const ox = (1 - sw) / 2, oy = (1 - sh) / 2;
  const rings = geomRings.map((r) => r.map((p) => [
    Math.round((ox + (p[0] * kx - minx) / m) * 1000) / 1000,
    Math.round((oy + (1 - (p[1] - miny) / m) * sh) * 1000) / 1000
  ]));

  const total = rings.reduce((s, r) => s + r.length, 0);
  out[t.cc] = { name: feats[0].properties.ADMIN, rings: rings };
  const dropped = raw.length - kept.length;
  console.log(`${t.cc} ${out[t.cc].name.padEnd(12)} ${rings.length} ring(s) ${String(total).padStart(3)}pts  aspect ${sw.toFixed(2)}x${sh.toFixed(2)}` +
    `  ringSizes [${rings.map((r) => r.length).join(',')}]` +
    (merged.length ? '  merged: ' + merged.join(', ') : '') +
    (dropped ? `  dropped ${dropped} overseas ring(s)` : ''));
}

const body = TARGETS.map((t) => {
  const o = out[t.cc];
  if (!o) return '';
  const rings = o.rings.map((r) => '[' + r.map((p) => '[' + p[0] + ',' + p[1] + ']').join(',') + ']').join(',\n        ');
  return `    ${t.cc}: { name: ${JSON.stringify(o.name)},\n      rings: [${rings}] }`;
}).filter(Boolean).join(',\n');

const js = `/* =========================================================================
   world.execute(me); — country silhouettes
   The six counting beats are sung in six languages ("EIN", "DOS", "TROIS",
   "NE", "FEM", "LIU"), so each one becomes that country's silhouette.

   Real outlines (Natural Earth 1:50m admin-0), reduced with Douglas-Peucker by
   _pv/mkgeo.js. Each country is a list of RINGS: its mainland AND its islands.
   Dropping everything but the biggest ring deleted Taiwan and Hainan from
   China, Corsica from France and Gotland from Sweden, which is simply a wrong
   map. China's rings include Taiwan.

   Regenerate with:  node _pv/mkgeo.js
   ========================================================================= */
(function (root) {
  'use strict';
  root.PVGEO = {
${body}
  };
})(window);
`;
fs.writeFileSync(OUT, js, 'utf8');
console.log('\nwrote ' + OUT + '  (' + Math.round(js.length / 1024) + ' KB)');

/* Character art from OUTLINE POLYGONS (even-odd fill), so shapes are exact.
   node _pv/genart.js <shape> [w] [h]
   Works in u,v in [-1,1]; v grows downward. */
'use strict';

const RAMP = ' .:-=+*#%@';

/* ---------- polygon fill ---------- */
function inPoly(u, v, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if (((yi > v) !== (yj > v)) && (u < (xj - xi) * (v - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function poly(pts) { return (u, v) => (inPoly(u, v, pts) ? 1 : 0); }
function union(...fs) { return (u, v) => { let t = 0; for (const f of fs) t = Math.max(t, f(u, v)); return t; }; }
function stroke(cx, cy, r, th, keep) {
  return (u, v) => {
    const d = Math.abs(Math.hypot(u - cx, v - cy) - r);
    return d < th && (!keep || keep(u, v)) ? 1 : 0;
  };
}
function box(x0, x1, y0, y1) { return (u, v) => (u > x0 && u < x1 && v > y0 && v < y1 ? 1 : 0); }
function disc(cx, cy, rx, ry, keep) {
  return (u, v) => {
    const a = (u - cx) / rx, b = (v - cy) / ry;
    return (a * a + b * b < 1 && (!keep || keep(u, v))) ? 1 : 0;
  };
}
function ring(cx, cy, r, th, keep) {
  return (u, v) => {
    const d = Math.abs(Math.hypot(u - cx, v - cy) - r);
    return (d < th && (!keep || keep(u, v))) ? 1 : 0;
  };
}
/* quadratic bezier sampled into a polygon */
function qcurve(x0, y0, cx, cy, x1, y1, n) {
  const p = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    p.push(m * m * x0 + 2 * m * t * cx + t * t * x1, m * m * y0 + 2 * m * t * cy + t * t * y1);
  }
  return p;
}

/* ---------- seated tabby, facing right ----------
   A cat at rest is a triangle: wide round base, tapering up to a small head.
   Ground at v=0.94. Haunch on the LEFT, head up on the RIGHT, tail wrapping
   around the front paws. */
const cat = union(
  /* haunch: round rear (this is most of the silhouette) */
  disc(-0.30, 0.34, 0.52, 0.56),
  /* back: slopes up from the haunch to the shoulders */
  poly([-0.74, 0.16, -0.28, -0.24, 0.26, -0.28, 0.30, 0.12, -0.28, 0.44]),
  /* chest + shoulder mass */
  disc(0.26, 0.22, 0.28, 0.50),
  /* front legs: a narrow column, NOT as wide as the chest */
  box(0.24, 0.46, 0.44, 0.92),
  /* paws */
  box(0.16, 0.50, 0.84, 0.94),
  /* neck */
  poly([0.06, -0.40, 0.42, -0.44, 0.44, -0.08, 0.04, -0.04]),
  /* head */
  disc(0.40, -0.58, 0.28, 0.26),
  /* muzzle */
  disc(0.60, -0.48, 0.18, 0.14),
  /* ears */
  poly([0.20, -0.72, 0.22, -0.98, 0.42, -0.78]),
  poly([0.42, -0.82, 0.54, -0.98, 0.58, -0.72]),
  /* tail: a thin band along the ground, drawn as a flat box with a round end */
  box(-0.62, 0.92, 0.80, 0.94),
  disc(0.90, 0.87, 0.13, 0.11),
);
const catEye = union(disc(0.44, -0.60, 0.055, 0.05), disc(0.62, -0.54, 0.05, 0.045));

/* ---------- eggplant ---------- */
const EGG = [
  0.02, -0.52,   // top of fruit, under the calyx
  0.30, -0.36,
  0.46, 0.02,
  0.44, 0.42,
  0.26, 0.80,
  0.00, 0.96,
  -0.26, 0.80,
  -0.44, 0.42,
  -0.46, 0.02,
  -0.30, -0.36,
];
const eggplant = union(
  poly(EGG),
  box(-0.30, 0.30, -0.66, -0.46),   // calyx
  box(-0.07, 0.09, -0.98, -0.62),   // stem
);

/* ---------- tomato ---------- */
const TOM = [];
for (let i = 0; i < 40; i++) {
  const a = i / 40 * Math.PI * 2;
  TOM.push(Math.cos(a) * 0.62, Math.sin(a) * 0.52 + 0.14);
}
const tomato = union(
  poly(TOM),
  box(-0.08, 0.08, -0.62, -0.34),
  poly([-0.50, -0.24, -0.12, -0.34, -0.22, -0.66]),
  poly([0.50, -0.24, 0.12, -0.34, 0.22, -0.66]),
);

/* ---------- heart ---------- */
const heart = (u, v) => {
  const x = u / 0.86, y = -v / 0.86;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y < 0 ? 1 : 0;
};

/* ---------- cage ---------- */
const cage = union(
  box(-0.88, 0.88, -0.82, -0.72),
  box(-0.88, 0.88, 0.74, 0.84),
  box(-0.88, -0.78, -0.80, 0.82),
  box(0.78, 0.88, -0.80, 0.82),
  ...[0, 1, 2, 3, 4].map((k) => box(-0.40 + k * 0.20 - 0.02, -0.40 + k * 0.20 + 0.02, -0.72, 0.76)),
);

/* ---------- gender glyphs ---------- */
const female = union(
  stroke(-0.24, -0.34, 0.34, 0.075),
  box(-0.275, -0.205, -0.02, 0.52),
  box(-0.46, -0.02, 0.30, 0.37),
);
const male = union(
  stroke(0.22, -0.30, 0.32, 0.070),
  (u, v) => {
    /* the arrow at 45°, with a head */
    const t = (v + 0.30) - (u - 0.22);
    if (u > 0.44 && u < 0.86 && Math.abs(t) < 0.075) return 1;
    if (u > 0.62 && u < 0.96 && v > -0.86 && v < -0.30 && Math.abs(u - 0.80) + Math.abs(v + 0.58) < 0.24) return 1;
    return 0;
  },
);

/* ---------- render ---------- */
function paint(fn, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) {
    let line = '';
    for (let x = 0; x < w; x++) {
      const u = (x / (w - 1)) * 2 - 1;
      const v = (y / (h - 1)) * 2 - 1;
      line += RAMP.charAt(Math.round(Math.max(0, Math.min(1, fn(u, v))) * (RAMP.length - 1)));
    }
    out.push(line);
  }
  return out.join('\n');
}

/* cat gets its eyes punched out */
function withEyes(f, e) { return (u, v) => (e(u, v) ? 0 : f(u, v)); }

const F = {
  cat: withEyes(cat, catEye),
  eggplant, tomato, heart, cage, female, male,
  both: union(female, male)
};
const which = process.argv[2] || 'cat';
const W = +(process.argv[3] || 44), H = +(process.argv[4] || 22);
console.log('=== ' + which + ' ===');
console.log(paint(F[which], W, H));

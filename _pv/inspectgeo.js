/* What rings are actually in the source file? List every ring with its area,
   bbox and centroid so I can tell whether Taiwan and Hainan are even present,
   and what they are called.
   node _pv/inspectgeo.js CHN */
const fs = require('fs');
const path = require('path');
const cc = process.argv[2] || 'CHN';
const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'geo', cc + '.json'), 'utf8'));
console.log('features:', j.features.length);
function area(r) { let a = 0; for (let i = 0, k = r.length - 1; i < r.length; k = i++) a += r[k][0] * r[i][1] - r[i][0] * r[k][1]; return Math.abs(a / 2); }
j.features.forEach((f, fi) => {
  const g = f.geometry;
  let rings = [];
  if (g.type === 'Polygon') rings = g.coordinates;
  else if (g.type === 'MultiPolygon') for (const p of g.coordinates) for (const r of p) rings.push(r);
  const sorted = rings.map((r) => ({ r: r, a: area(r) })).sort((x, y) => y.a - x.a);
  console.log(`\nfeature ${fi} ${f.properties.name}  ${g.type}  ${rings.length} rings`);
  sorted.slice(0, 14).forEach((o, i) => {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of o.r) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    console.log(`  #${i} area=${o.a.toFixed(3)} pts=${o.r.length}  lon ${minx.toFixed(1)}..${maxx.toFixed(1)}  lat ${miny.toFixed(1)}..${maxy.toFixed(1)}  centre ${cx.toFixed(1)},${cy.toFixed(1)}`);
  });
});

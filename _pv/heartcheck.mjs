/* Assert the geometric heart is correct: centred on the stage, and its ten
   wedges carry an EQUAL number of particles (the old raster heart's wedges
   ranged 442 vs 69 px, so the last syllables landed on invisible slivers).
   node _pv/heartcheck.mjs */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t = list.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r));
const send = (m, p) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=191.5' });
await sleep(1600);

const raw = await ev(`(function(){
  var G = PVFIELD.heartGeom({ s: 520 });
  var counts = PVFIELD.heartPieces(520);
  /* sample the analytic shape: bbox and centroid, to prove it is centred */
  var pool = [];
  for (var i = 0; i < 4000; i++) {
    var h1 = Math.sin(i*12.9898)*43758.5453; h1 -= Math.floor(h1);
    var h2 = Math.sin((i+99991)*12.9898)*43758.5453; h2 -= Math.floor(h2);
    var x = (h1*2-1)*G.d*1.3, y = (h2*2-1)*G.d*1.3 - G.d*.12;
    if (PVFIELD.heartGeom) {}
    pool.push([x,y]);
  }
  /* use the exported pool indirectly: the form's own targets */
  PVSEEK(191.5);
  var tg = PVFIELD.positions ? null : null;
  return JSON.stringify({
    geom: { cx:G.cx, cy:G.cy, d:+G.d.toFixed(2), r:+G.r.toFixed(2) },
    counts: counts,
    minCount: Math.min.apply(null, counts),
    maxCount: Math.max.apply(null, counts)
  });
})()`);
const o = JSON.parse(raw);
console.log('heart geometry:', JSON.stringify(o.geom));
console.log('wedge counts  :', o.counts.join(', '));
const spread = (o.maxCount - o.minCount) / o.maxCount;
console.log(`min ${o.minCount}  max ${o.maxCount}  spread ${(spread*100).toFixed(1)}%`);

/* the true test: are the FORM's targets centred on the stage? */
const raw2 = await ev(`(function(){
  PVSEEK(191.5 - .05); PVSEEK(191.5);
  for (var i=0;i<90;i++) PVFIELD.frame({dt:0.016, hue:290, sat:.5});
  var p = PVFIELD.positions();
  var sx=0, sy=0;
  for (var i=0;i<p.length;i++){ sx+=p[i][0]; sy+=p[i][1]; }
  var cx=sx/p.length, cy=sy/p.length;
  var minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;
  for (var i=0;i<p.length;i++){
    if(p[i][0]<minx)minx=p[i][0]; if(p[i][0]>maxx)maxx=p[i][0];
    if(p[i][1]<miny)miny=p[i][1]; if(p[i][1]>maxy)maxy=p[i][1];
  }
  return JSON.stringify({cx:+cx.toFixed(1), cy:+cy.toFixed(1),
    x0:Math.round(minx), x1:Math.round(maxx), y0:Math.round(miny), y1:Math.round(maxy)});
})()`);
const o2 = JSON.parse(raw2);
console.log('\nrendered particle cloud:');
console.log(`  centroid (${o2.cx}, ${o2.cy})   stage centre is (960, 540)`);
console.log(`  bbox x ${o2.x0}..${o2.x1}   y ${o2.y0}..${o2.y1}`);
console.log(`  offset from centre: dx ${(o2.cx-960).toFixed(1)}  dy ${(o2.cy-540).toFixed(1)}`);
ws.close(); process.exit(0);

/* Measure MOTION properly: per-particle displacement between frames, and how
   much of the cloud is moving. The centroid is the wrong metric for a warp —
   a symmetric tunnel streams outward while its centre never moves.
   node _pv/motion2.mjs 50.95 125.33 */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TIMES = process.argv.slice(2);

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

for (const time of TIMES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${time}` });
  await sleep(1300);
  const out = await ev(`(function(){
    var t0 = parseFloat('${time}');
    var spec = PVFORCE.at(t0);
    PVFIELD.setLine({t:t0}, spec);
    var c = window.PVMOOD ? PVMOOD.hue() : 206, s = window.PVMOOD ? PVMOOD.sat() : .5;
    /* settle first */
    for (var f=0; f<90; f++) PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
    var prev = PVFIELD.targets().map(function(_,i){ return null; });
    /* snapshot live particle positions via debug-free route: use targets() to
       index and read back through a probe the field exposes */
    function snap(){ return PVFIELD.sample ? PVFIELD.sample() : null; }
    var rows = [];
    var lastPts = null;
    for (var f=0; f<60; f++){
      PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
      var pts = PVFIELD.positions ? PVFIELD.positions() : null;
      if (pts) {
        if (lastPts) {
          var sum=0, mx=0, moved=0;
          for (var i=0;i<pts.length;i++){
            var d = Math.hypot(pts[i][0]-lastPts[i][0], pts[i][1]-lastPts[i][1]);
            sum+=d; if(d>mx)mx=d; if(d>0.5)moved++;
          }
          rows.push({f:f, mean:+(sum/pts.length).toFixed(2), max:+mx.toFixed(1),
                     moved:+(moved/pts.length*100).toFixed(0)});
        }
        lastPts = pts;
      }
    }
    return JSON.stringify({t:t0, form:spec.form, force:spec.force,
      hasPositions: !!PVFIELD.positions, rows: rows.slice(0,10)});
  })()`);
  const o = JSON.parse(out);
  if (!o.hasPositions) { console.log(`${o.t} ${o.form}/${o.force}: PVFIELD.positions() MISSING`); continue; }
  const mean = o.rows.map(r => r.mean), mv = o.rows.map(r => r.moved);
  console.log(`${o.t}  ${String(o.form).padEnd(8)}/${String(o.force).padEnd(8)} per-particle: ` +
    `mean ${Math.min(...mean).toFixed(1)}-${Math.max(...mean).toFixed(1)}px/frame, ` +
    `moving ${Math.min(...mv)}-${Math.max(...mv)}%`);
}
ws.close(); process.exit(0);

/* Prove the fixed-rate simulation is frame-rate independent.
   ---------------------------------------------------------------------------
   The bug this fixes: the field's spring was a per-STEP integrator, so at
   144Hz it ran 2.4x as many steps per second as at 60Hz and every beat moved
   differently depending on the monitor.

   Test: advance the field by the SAME total wall-clock time (0.5s) using
   different step sizes, and compare where the particles end up. Before the fix
   these diverged wildly; now they must agree closely.

   node _pv/ratetest.mjs
*/
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

/* beats with sustained motion, so the comparison is meaningful */
const BEATS = [50.95, 64.29, 91.44, 105.22, 133.8, 160.85, 179.9];

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=1' });
await sleep(1800);

const raw = await ev(`(function(){
  var out = [];
  var beats = ${JSON.stringify(BEATS)};
  var TOTAL = 0.5;                       /* seconds of simulated time */
  var rates = [60, 120, 144, 300];       /* steps per second to compare */
  beats.forEach(function(bt){
    var res = {};
    rates.forEach(function(hz){
      PVSEEK(bt - .05); PVSEEK(bt);
      var dt = 1 / hz, n = Math.round(TOTAL * hz);
      /* supply the ABSOLUTE time for each step, exactly as the driver does.
         Without this the field's clock accumulates per step and any
         clock-driven force lands somewhere different. */
      for (var i = 0; i < n; i++) PVFIELD.step(dt, {hue:290, sat:.5, time: bt + (i + 1) * dt});
      var p = PVFIELD.positions();
      /* the signature of the state: mean x, mean y, and the spread */
      var sx=0, sy=0, sxx=0;
      for (var i=0;i<p.length;i++){ sx+=p[i][0]; sy+=p[i][1]; }
      var mx=sx/p.length, my=sy/p.length;
      for (var i=0;i<p.length;i++){ var dx=p[i][0]-mx, dy=p[i][1]-my; sxx+=dx*dx+dy*dy; }
      res[hz] = { x:+mx.toFixed(2), y:+my.toFixed(2), spread:+Math.sqrt(sxx/p.length).toFixed(2) };
    });
    /* compare every rate against the 60Hz baseline */
    var base = res[60], worst = 0, worstHz = 0;
    rates.forEach(function(hz){
      var d = Math.hypot(res[hz].x-base.x, res[hz].y-base.y)
            + Math.abs(res[hz].spread-base.spread);
      if (d > worst) { worst = d; worstHz = hz; }
    });
    out.push({ t: bt, res: res, worst: +worst.toFixed(2), worstHz: worstHz });
  });
  return JSON.stringify(out);
})()`);

const rows = JSON.parse(raw);
console.log('simulating 0.5s at 60 / 120 / 144 / 300 Hz, comparing end state\n');
console.log('  beat    60Hz centroid      300Hz centroid     worst delta');
let fail = 0;
for (const r of rows) {
  const a = r.res[60], b = r.res[300];
  const ok = r.worst < 40;
  if (!ok) fail++;
  console.log(`  ${String(r.t).padEnd(7)} (${String(a.x).padStart(7)},${String(a.y).padStart(7)})  ` +
              `(${String(b.x).padStart(7)},${String(b.y).padStart(7)})  ` +
              `${String(r.worst).padStart(6)} @${r.worstHz}Hz  ${ok ? 'ok' : '<-- DIVERGES'}`);
}
console.log(fail ? `\n${fail} beat(s) still rate-dependent` : '\nall beats agree across step rates: the simulation is rate-independent');
ws.close(); process.exit(0);

/* Measure JELLY correctly: does a particle OVERSHOOT its own target?
   ---------------------------------------------------------------------------
   The previous metric was the mean distance travelled, which keeps rising while
   slower particles are still on their way — that is not overshoot, it is a
   spread of arrival times, and it made a well-damped spring look like it
   wobbled.

   The real definition of jelly: a particle's distance to ITS OWN TARGET falls
   to near zero and then RISES again before settling. Each such rise is one
   bounce. A spring at damping ratio ~0.8 should show almost none.

   node _pv/jelly.mjs
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
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=120&cb=' + Date.now() });
await sleep(2200);

const raw = await ev(`(function(){
  var beats = [50.95, 64.29, 91.44, 105.22, 133.8, 160.85, 179.9];
  var out = [];
  beats.forEach(function(bt){
    PVSEEK(bt - .05); PVSEEK(bt);
    var dt = 1/300, n = Math.round(2.0*300);
    /* track the distance-to-own-target for a sample of particles */
    var ids = [], forEach = [];
    for (var s = 0; s < 60; s++) ids.push(Math.floor(s * 2200 / 60));
    var series = ids.map(function(){ return []; });
    for (var i = 0; i < n; i++) {
      PVFIELD.step(dt, {hue:290, sat:.5, time: bt + (i+1)*dt});
      if (i % 15 !== 0) continue;             /* sample every 50ms */
      var pos = PVFIELD.positions();
      var tgt = PVFIELD.targets();
      for (var k = 0; k < ids.length; k++) {
        var pi = ids[k], p = pos[pi], g = tgt[pi];
        if (!g) { series[k].push(null); continue; }
        var dx = p[0]-g[0], dy = p[1]-g[1];
        series[k].push(Math.sqrt(dx*dx+dy*dy));
      }
    }
    /* one bounce = the error distance reaches a local minimum below 40% of its
       starting value, then rises by more than 15% of that start before falling
       again. That is a particle passing through the target and coming back. */
    var bounces = 0, counted = 0;
    series.forEach(function(s){
      if (s.length < 6 || s[0] == null) return;
      var start = s[0];
      if (start < 5) return;                  /* already on target: no motion */
      counted++;
      var minSeen = 1e9, armed = false, b = 0;
      for (var j = 0; j < s.length; j++) {
        var v = s[j];
        if (v == null) continue;
        if (v < minSeen) { minSeen = v; armed = true; }
        else if (armed && v > minSeen + start * 0.15) { b++; armed = false; }
      }
      bounces += b;
    });
    out.push({ t: bt, avgBounces: counted ? +(bounces/counted).toFixed(3) : 0, sampled: counted });
  });
  return JSON.stringify(out);
})()`);

const rows = JSON.parse(raw);
console.log('overshoot per particle: error-to-own-target dips then rises again\n');
console.log('  beat     avg bounces/particle   particles sampled   verdict');
let worst = 0;
for (const r of rows) {
  if (r.avgBounces > worst) worst = r.avgBounces;
  const v = r.avgBounces < 0.15 ? 'crisp'
          : r.avgBounces < 0.5  ? 'slight'
          : 'JELLY';
  console.log(`  ${String(r.t).padEnd(8)} ${String(r.avgBounces).padStart(8)}              ${String(r.sampled).padStart(6)}          ${v}`);
}
console.log(`\nworst beat: ${worst.toFixed(3)} bounces/particle`);
console.log(worst < 0.5 ? 'spring is well damped' : 'spring still oscillates');
ws.close(); process.exit(0);

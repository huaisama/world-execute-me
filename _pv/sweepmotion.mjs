/* Measure field motion DURING a beat instead of after it has settled.
   motion2.mjs drives 90 frames to let the field settle before measuring, which
   is right for a long held form but wrong for the six country beats: each is
   only ~0.4s long and its whole animation is the sweep at the start. Measuring
   after settling reports "0% moving" and would send me chasing a bug that is
   not there — or worse, hide one that is.
   node _pv/sweepmotion.mjs <t> [frames] */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const times = process.argv.slice(2).map(Number);
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

for (const tt of times) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}` });
  await sleep(1400);
  const raw = await ev(`(function(){
    PVSEEK(${tt} - .05); PVSEEK(${tt});
    var a = PVFIELD.positions();
    var rows = [];
    /* sample the first 30 frames after the beat starts = the sweep window */
    for (var f = 0; f < 30; f++) {
      PVFIELD.frame({dt:0.016, hue:290, sat:.5});
      var b = PVFIELD.positions();
      var sum = 0, mv = 0;
      for (var i = 0; i < a.length; i++) {
        var d = Math.hypot(b[i][0]-a[i][0], b[i][1]-a[i][1]);
        sum += d; if (d > .5) mv++;
      }
      rows.push({f:f, mean:+(sum/a.length).toFixed(2), pct:Math.round(mv/a.length*100)});
      a = b;
    }
    var peak = rows.reduce(function(m,r){ return r.mean > m.mean ? r : m; }, rows[0]);
    return JSON.stringify({rows:rows.slice(0,8), peak:peak});
  })()`);
  const o = JSON.parse(raw);
  console.log(`t=${tt}  peak mean ${o.peak.mean}px/frame at frame ${o.peak.f} (${o.peak.pct}% moving)`);
  console.log('   first frames: ' + o.rows.map(r => `${r.mean}(${r.pct}%)`).join(' '));
}
ws.close(); process.exit(0);

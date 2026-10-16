/* Why does the sweep report 1% moving when the force writes offsets every
   frame? Drive the field directly and print the RAW offset the force produced
   for a few particles, so the force's own output is visible instead of
   inferring it from positions after 90 settle frames. */
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
const tt = process.argv[2] || '154.5';
await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}` });
await sleep(1400);
const raw = await ev(`(function(){
  var a = PVFIELD.positions();
  var rows = [];
  for (var f = 0; f < 40; f++) {
    PVFIELD.frame({dt:0.016, hue:290, sat:.5});
    var b = PVFIELD.positions();
    var sum = 0, mv = 0, mx = 0;
    for (var i = 0; i < a.length; i++) {
      var d = Math.hypot(b[i][0]-a[i][0], b[i][1]-a[i][1]);
      sum += d; if (d > .5) mv++; if (d > mx) mx = d;
    }
    rows.push({f:f, mean:+(sum/a.length).toFixed(2), pct:Math.round(mv/a.length*100), max:+mx.toFixed(1)});
    a = b;
  }
  return JSON.stringify(rows);
})()`);
const rows = JSON.parse(raw);
console.log('t=' + tt);
for (const r of rows.slice(0, 40)) console.log(`  f=${String(r.f).padStart(2)}  mean ${r.mean}  max ${r.max}  ${r.pct}%`);
ws.close(); process.exit(0);

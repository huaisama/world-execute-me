/* Verify the crossbar ARRIVES over time rather than being present at once, and
   that the "only god" beat keeps the upright alone. Samples the vector layer's
   cross at increasing elapsed time after the beat starts.
   node _pv/crosscheck.mjs */
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

/* instrument the canvas: record how much ink lands in the crossbar band vs the
   whole cross, at successive moments after the beat begins */
for (const [label, time] of [['only god (bar must stay 0)', 84.60], ['proof (bar must arrive)', 86.21]]) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${time}` });
  await sleep(1500);
  const out = await ev(`(function(){
    try {
    var t0 = ${time};
    var rows = [];
    [0.02, 0.10, 0.25, 0.45, 0.70, 1.20].forEach(function(el){
      PVSEEK(t0 - .05); PVSEEK(t0);
      var steps = Math.round(el / 0.016);
      for (var i=0;i<steps;i++) PVVECTOR.frame({dt:0.016, hue:206, sat:.5});
      PVVECTOR.frame({dt:0.001, hue:206, sat:.5});
      rows.push({el:el, bar:PVVECTOR.bar(), mode:PVVECTOR.mode()});
    });
    return JSON.stringify({rows:rows});
    } catch(e) { return JSON.stringify({error: e.message + ' @' + e.lineno}); }
  })()`);
  const o = JSON.parse(out);
  console.log(`\n${label}`);
  if (o.error) { console.log('   ERROR ' + o.error); continue; }
  for (const r of o.rows) {
    const b = r.bar || {};
    console.log(`   +${String(r.el).padEnd(5)}s  mode=${r.mode}  target=${b.target}  showBar=${b.showBar}`);
  }
}
ws.close(); process.exit(0);

/* Measure whether the field ACTUALLY moves during a beat.
   Drives frames by hand and samples the particle cloud, so "the animation is
   basically absent" becomes a number instead of an opinion.
   node _pv/motion.mjs 50.95 52.99 125.33 */
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
    if (window.PVVECTOR) PVVECTOR.setLine(spec);
    if (window.PVSYS) PVSYS.setLine(spec);
    var samples = [];
    for (var f=0; f<150; f++){
      var c = window.PVMOOD ? PVMOOD.hue() : 206, s = window.PVMOOD ? PVMOOD.sat() : .5;
      PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
      if (window.PVRAIN) PVRAIN.frame({dt:0.016, hot:0, hue:c, sat:s, mass:1});
      if (window.PVVECTOR) PVVECTOR.frame({dt:0.016, hue:c, sat:s});
      if (window.PVSYS) PVSYS.frame({dt:0.016});
      if (f % 15 === 0) {
        var d = PVFIELD.debug();
        samples.push({f:f, mean:d.meanPos, err:d.meanErr});
      }
    }
    /* frame-to-frame movement: how far does a particle travel per frame? */
    var before = PVFIELD.targets();
    var P = null;
    return JSON.stringify({t:t0, form:spec.form, force:spec.force, samples:samples});
  })()`);
  const o = JSON.parse(out);
  const xs = o.samples.map(s => s.mean[0]), ys = o.samples.map(s => s.mean[1]);
  const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
  console.log(`${o.t}  ${String(o.form).padEnd(9)}/${String(o.force).padEnd(9)} centroid travel: dx=${spanX}px dy=${spanY}px`);
  console.log('    path ' + o.samples.map(s => `${s.mean[0]},${s.mean[1]}`).join(' -> '));
}
ws.close(); process.exit(0);

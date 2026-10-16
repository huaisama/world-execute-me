/* Deterministic field screenshots: navigate, drive N frames by hand (so the
   particles actually converge, which headless rAF does not give us), capture. */
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 9333;
const OUT = process.env.TEMP + '\\pvshot';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TIMES = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

for (const time of TIMES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&aff=95&t=${time}` });
  await sleep(1200);
  /* Drive 300 frames at a fixed dt so the springs settle, and advance EVERY
     canvas: the field, the scripture rain, and the vector layer. Missing one
     of these silently produces a screenshot where that layer is blank — which
     is exactly how a "still broken" reading can be an artefact of the tool. */
  /* Drive with the PAGE'S OWN wiring, not by calling the layers by hand.
     Calling PVFIELD.setLine / PVVECTOR.setLine directly skipped everything
     pv.js decides at a beat — the built-in aHeartPiece override, the solid
     vector heart, the quiet factor — so screenshots showed a state the page
     never actually renders (vec: null on a heart beat). PVSEEK is the same
     function the rail and the arrow keys use. */
  const info = await ev(`(function(){
    var t = parseFloat('${time}');
    var spec = window.PVFORCE ? PVFORCE.at(t) : null;
    var mass = (spec && spec.k && spec.k.mass != null) ? spec.k.mass : 1;
    if (window.PVSEEK) {
      PVSEEK(t - 0.02);          /* just before the beat */
      PVSEEK(t);                 /* then land on it, through enter() */
    } else {
      if (window.PVVECTOR) PVVECTOR.setLine(spec);
      if (window.PVSYS) PVSYS.setLine(spec);
    }
    for (var i=0;i<300;i++){
      var c = window.PVMOOD ? PVMOOD.hue() : 206, s = window.PVMOOD ? PVMOOD.sat() : .5;
      PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
      if (window.PVRAIN) PVRAIN.frame({dt:0.016, hot:0, hue:c, sat:s, mass:mass});
      if (window.PVVECTOR) PVVECTOR.frame({dt:0.016, hue:c, sat:s});
      if (window.PVSYS) PVSYS.frame({dt:0.016});
    }
    return JSON.stringify({field:PVFIELD.debug(), rain: (window.PVRAIN?PVRAIN.mode():'off'),
      vec: (window.PVVECTOR?PVVECTOR.mode():'off'),
      vecPieces: (window.PVVECTOR&&PVVECTOR.pieces)?PVVECTOR.pieces():null,
      sys: (window.PVSYS&&PVSYS.on)?PVSYS.on():false});
  })()`);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}\\h_${time}.png`, Buffer.from(r.result.data, 'base64'));
  console.log(time, info);
}
ws.close(); process.exit(0);

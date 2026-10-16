/* Capture the ending so it can actually be looked at.
   node _pv/endshots.mjs
   writes %TEMP%\pvshot\end_<t>.png
*/
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = 9333;
const OUT = path.join(os.tmpdir(), 'pvshot');
fs.mkdirSync(OUT, { recursive: true });
const TIMES = [205.6, 208.8, 209.9, 210.4, 210.9, 211.4, 211.8];
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

/* sim mode: deterministic, driven by the clock we set, no audio needed.
   NOTE: do NOT pass pure=0 — the query values are STRINGS, and the string "0"
   is truthy, so it silently turned on pure mode and every frame came out
   hue 206 / sat 0. Omit the key entirely to leave it off. */
await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=205&cb=' + Date.now() });
await sleep(2200);
/* headless throttles requestAnimationFrame for a backgrounded page, and both
   --out and the mood are applied inside the page's own frame(). Without this
   the seeks below change the clock but nothing on screen ever updates. */
await send('Page.bringToFront');

for (const time of TIMES) {
  /* seek, then run the field forward so the physics is settled at that time */
  await ev(`(function(){
    PVSEEK(${time});
    for (var i = 0; i < 90; i++) PVFIELD.step(1/300, { hue: 44, sat: .9, time: ${time} });
    PVFIELD.draw(1/60);
    return 1;
  })()`);
  /* let the page's frame() run so --out, the mood and the CSS classes catch up */
  await sleep(700);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, `end_${String(time).replace('.', '_')}.png`);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  const out = await ev(`getComputedStyle(document.getElementById('screen')).getPropertyValue('--out').trim()`);
  const hue = await ev(`getComputedStyle(document.getElementById('screen')).getPropertyValue('--hue').trim()`);
  const sat = await ev(`getComputedStyle(document.getElementById('screen')).getPropertyValue('--sat').trim()`);
  console.log(`  t=${String(time).padStart(6)}s  --out=${out.padStart(6)}  hue=${hue.padStart(6)}  sat=${sat.padStart(6)}  -> ${path.basename(file)}`);
}
console.log('\ndone ->', OUT);
ws.close(); process.exit(0);

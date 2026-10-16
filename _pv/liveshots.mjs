/* Screenshot the LIVE site at a few strong moments, straight from the URL, so
   "it works online" is something you can look at rather than take on trust. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = 9333;
const URL = process.argv[2] || 'https://huaisama.github.io/world-execute-me/';
const OUT = path.join(os.tmpdir(), 'pvshot');
fs.mkdirSync(OUT, { recursive: true });
const SHOTS = [
  { t: 191.95, name: 'live_heart' },
  { t: 160.85, name: 'live_china' },
  { t: 211.60, name: 'live_ending' }
];
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
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

await send('Page.navigate', { url: URL + '?sim=1&still=1&t=180' });
await sleep(4000);
await send('Page.bringToFront');

for (const s of SHOTS) {
  await ev(`(function(){
    PVSEEK(${s.t});
    for (var i = 0; i < 120; i++) PVFIELD.step(1/300, { hue: 44, sat: .9, time: ${s.t} });
    PVFIELD.draw(1/60);
    return 1;
  })()`);
  await sleep(900);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(OUT, s.name + '.png');
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log(`  t=${String(s.t).padStart(7)}s -> ${path.basename(file)}`);
}
console.log('\ndone ->', OUT);
ws.close(); process.exit(0);

/* Record ~13s of the PV page in real time via CDP, so the transitions and the
   per-beat motion can actually be watched instead of guessed from stills.
   Usage: launch Edge with --remote-debugging-port=9333, then `node _pv/record.mjs` */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const PORT = 9333;
const DIR = process.env.TEMP + '\\pvframes';
const SECONDS = Number(process.argv[2] || 13);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find(x => x.type === 'page');
  if (!t) throw new Error('no page target');
  return t.webSocketDebuggerUrl;
}
function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const ready = new Promise(r => ws.addEventListener('open', r));
  const send = (method, params) => new Promise(res => {
    const i = ++id; pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  return { ws, ready, send };
}

(async () => {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const { ws, ready, send } = connect(await target());
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  await send('Page.navigate', { url: 'http://127.0.0.1:8899/pv.html' + (process.argv[3] ? '?t=' + process.argv[3] : '') });
  await sleep(2600);
  // real click on the start gate -> gives the page its user gesture
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: 800, y: 450, button: 'left', clickCount: 1 });
  }

  const times = [];
  const t0 = Date.now();
  let n = 0;
  while ((Date.now() - t0) / 1000 < SECONDS) {
    const ts = Date.now() - t0;
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    if (r.result && r.result.data) {
      writeFileSync(`${DIR}\\f${String(n).padStart(4, '0')}.jpg`, Buffer.from(r.result.data, 'base64'));
      times.push(ts); n++;
    }
  }
  writeFileSync(`${DIR}\\times.json`, JSON.stringify(times));
  console.log(`captured ${n} frames over ${(Date.now() - t0) / 1000}s -> ${DIR}`);
  ws.close();
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });

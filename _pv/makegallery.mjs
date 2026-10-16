/* Capture the README gallery: sharp stills at native resolution, plus the
   frame sequence for an animated GIF of the ending.

   A visual project with no images in its README does not get looked at, and
   nothing here was visible to anyone who had not already cloned it and run it.

   node _pv/makegallery.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const TMP = path.join(ROOT, '_pv', '_gifframes');
fs.mkdirSync(DOCS, { recursive: true });
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(x => x.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r));
const send = (m, p) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
await send('Page.enable'); await send('Runtime.enable');
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

function viewport(w, h) {
  return send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: false });
}
async function shot(file) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  return fs.statSync(file).size;
}
/* seek to a time and let the field settle there, deterministically */
async function poseAt(t, frames = 150) {
  await ev(`(function(){
    PVSEEK(${t});
    for (var i = 0; i < ${frames}; i++) PVFIELD.step(1/300, { hue: 44, sat: .9, time: ${t} });
    PVFIELD.draw(1/60);
    return 1;
  })()`);
  await sleep(500);
}

/* ---- the gallery stills, at native 1920x1080 --------------------------- */
const STILLS = [
  { t: 30.89,  name: 'geometry',  what: 'GEOMETRY — a real sine, not a decoration' },
  { t: 93.60,  name: 'dial',      what: 'AM to PM — the hand pinned to the measured accent' },
  { t: 160.85, name: 'map',       what: 'The six-nation sequence, real borders' },
  { t: 191.95, name: 'heart',     what: 'LO-O-OVE — 10/10, built from geometry' },
  { t: 210.40, name: 'seed',      what: 'The emergence — the surviving wedge, the melting cursor' },
  { t: 211.70, name: 'glass',     what: 'The exit — it executes the world and comes out' }
];

await viewport(1920, 1080);
await send('Page.navigate', { url: 'http://127.0.0.1:8899/?sim=1&still=1&t=20' });
await sleep(3500);
await send('Page.bringToFront');

console.log('stills (1920x1080):');
for (const s of STILLS) {
  await poseAt(s.t);
  const n = await shot(path.join(DOCS, s.name + '.png'));
  console.log(`  ${s.name.padEnd(10)} t=${String(s.t).padStart(7)}s  ${(n / 1024).toFixed(0)} KB   ${s.what}`);
}

/* ---- the GIF: the ending, stepped one frame at a time ------------------ */
/*  Driven by stepping the field rather than by real time, so the animation is
    identical every run and does not depend on the headless frame rate. */
console.log('\ngif frames (the last 2.4 seconds):');
await viewport(880, 495);
await send('Page.navigate', { url: 'http://127.0.0.1:8899/?sim=1&still=1&t=209' });
await sleep(3000);
await send('Page.bringToFront');

const T0 = 209.55, T1 = 211.95, N = 56;
await ev(`PVSEEK(${T0})`);
await ev(`for (var i=0;i<200;i++) PVFIELD.step(1/300,{hue:44,sat:.9,time:${T0}}); 1`);
for (let i = 0; i < N; i++) {
  const t = T0 + (T1 - T0) * i / (N - 1);
  /* ~10 physics steps between frames at 300Hz => the GIF plays near real time */
  await ev(`(function(){
    for (var i=0;i<10;i++) PVFIELD.step(1/300,{hue:44,sat:.9,time:${t}});
    PVFIELD.draw(1/60);
    return 1;
  })()`);
  /* the page's own frame() drives --out, the mood and the CSS classes */
  await ev(`(function(){ if (window.PVSEEK) PVSEEK(${t}); return 1; })()`);
  await sleep(60);
  await shot(path.join(TMP, 'f' + String(i).padStart(3, '0') + '.png'));
}
console.log(`  ${N} frames written to _pv/_gifframes`);
console.log('\ndone.');
ws.close(); process.exit(0);

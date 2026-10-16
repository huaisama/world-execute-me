/* Verify the three fixes at a 2.5K viewport.
   ---------------------------------------------------------------------------
   A. RESOLUTION: the canvas backing stores must be bigger than 1920x1080 when
      the window is 2560 wide, instead of a 1080p buffer being upscaled.
   B. JELLY: a spring that is lightly damped overshoots its target repeatedly.
      Drive a step change and count how many times the cloud crosses its target
      before settling. The old damping (.78) crossed several times; a properly
      damped spring should cross at most once.
   C. GPU: the compositor hints must be present.

   node _pv/hardwaretest.mjs
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
await send('Page.enable'); await send('Runtime.enable');
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

/* force a 2560x1440 viewport with a device pixel ratio, i.e. a 2.5K panel,
   and disable the cache so a stale script cannot make this report a pass or a
   failure that is not real */
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: 2560, height: 1440, deviceScaleFactor: 1, mobile: false
});

const errs = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
});

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=120&cb=' + Date.now() });
await sleep(2200);
console.log('page exceptions :', errs.length ? errs.join(' | ') : 'none');

/* ---- A. resolution ---- */
const res = await ev(`(function(){
  var out = {};
  ['pvfield','pvvector','pvrain'].forEach(function(id){
    var c = document.getElementById(id);
    if (!c) { out[id] = 'MISSING'; return; }
    out[id] = { backing: c.width + 'x' + c.height,
                css: c.style.width + 'x' + c.style.height };
  });
  out.dpr = window.devicePixelRatio;
  out.screenScale = getComputedStyle(document.getElementById('screen')).getPropertyValue('--s').trim();
  out.renderScale = window.PVDPR ? window.PVDPR.current() : null;
  out.canvasCount = document.querySelectorAll('canvas').length;
  return JSON.stringify(out);
})()`);
const R = JSON.parse(res);
console.log('=== A. resolution @ 2560x1440 ===');
console.log('  devicePixelRatio :', R.dpr);
console.log('  stage --s        :', R.screenScale);
console.log('  render scale     :', R.renderScale);
for (const k of ['pvfield', 'pvvector', 'pvrain']) {
  const v = R[k];
  if (typeof v === 'string') { console.log(`  ${k.padEnd(10)} ${v}`); continue; }
  const w = parseInt(v.backing.split('x')[0], 10);
  const ok = w > 1920;
  console.log(`  ${k.padEnd(10)} backing ${v.backing.padEnd(12)} css ${v.css.padEnd(12)} ${ok ? 'ok (above 1080p)' : '<-- NOT ADAPTED'}`);
}

/* ---- B. jelly: count overshoots of a step response ---- */
const jelly = await ev(`(function(){
  /* drive the cloud from one shape to another and watch the mean distance to
     target. A spring that overshoots will let that distance go NEGATIVE-ish —
     i.e. the cloud passes through the target and comes back. We track the
     signed radial error along the direction of travel. */
  function probe(beat){
    PVSEEK(beat - .05); PVSEEK(beat);
    var prevX = [], prevY = [];
    var p0 = PVFIELD.positions();
    /* step it 1.6s at the locked 300Hz and record the mean signed progress */
    var samples = [];
    var dt = 1/300, n = Math.round(1.6*300);
    var last = null;
    for (var i=0;i<n;i++){
      PVFIELD.step(dt, {hue:290, sat:.5, time: beat + (i+1)*dt});
      if (i % 12 !== 0) continue;
      var p = PVFIELD.positions();
      /* mean displacement of every particle from where it started */
      var sum = 0, cnt = 0;
      for (var k=0;k<p.length;k++){
        var dx = p[k][0]-p0[k][0], dy = p[k][1]-p0[k][1];
        sum += Math.sqrt(dx*dx+dy*dy); cnt++;
      }
      samples.push(sum/cnt);
    }
    /* overshoot = the travel distance reaches a max and then comes back down
       by more than 2px before settling. Each such reversal is one bounce. */
    var peaks = 0, rising = true, localMax = -1e9, drops = 0;
    for (var j=1;j<samples.length;j++){
      var d = samples[j] - samples[j-1];
      if (d > 0.2) { if (!rising) { rising = true; } }
      else if (d < -0.2 && rising) { rising = false; drops++; }
    }
    var settle = samples[samples.length-1], peak = Math.max.apply(null, samples);
    return { beat: beat, bounces: drops, peak: +peak.toFixed(1), end: +settle.toFixed(1),
             overshootPct: +( (peak-settle) / (peak||1) * 100 ).toFixed(1) };
  }
  var out = [];
  [50.95, 64.29, 91.44, 105.22, 133.8, 160.85, 179.9].forEach(function(b){ out.push(probe(b)); });
  return JSON.stringify(out);
})()`);
const J = JSON.parse(jelly);
console.log('\n=== B. jelly: direction reversals while settling (fewer = less wobble) ===');
console.log('  beat     bounces   peak(dist)   settled    overshoot');
let worst = 0;
for (const r of J) {
  if (r.bounces > worst) worst = r.bounces;
  const flag = r.bounces > 2 ? '  <-- wobbles' : '';
  console.log(`  ${String(r.beat).padEnd(8)} ${String(r.bounces).padStart(4)}     ${String(r.peak).padStart(8)}   ${String(r.end).padStart(8)}   ${String(r.overshootPct).padStart(6)}%${flag}`);
}
console.log(`  worst: ${worst} reversal(s)`);

/* ---- C. GPU hints ---- */
const gpu = await ev(`(function(){
  var out = {};
  ['screen','stage','pvfield','pvvector','pvrain'].forEach(function(id){
    var el = document.getElementById(id);
    if (!el) { out[id]='MISSING'; return; }
    var cs = getComputedStyle(el);
    out[id] = { willChange: cs.willChange, backface: cs.backfaceVisibility };
  });
  return JSON.stringify(out);
})()`);
const G = JSON.parse(gpu);
console.log('\n=== C. GPU compositing hints ===');
for (const k of Object.keys(G)) {
  const v = G[k];
  if (typeof v === 'string') { console.log(`  ${k.padEnd(10)} ${v}`); continue; }
  const ok = v.willChange === 'transform';
  console.log(`  ${k.padEnd(10)} will-change:${String(v.willChange).padEnd(12)} backface:${v.backface}  ${ok ? 'ok' : ''}`);
}

ws.close(); process.exit(0);

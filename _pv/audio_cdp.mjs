/* Real-time (non virtual-time) verification of the audio path over http.
   Launches nothing itself: it connects to an Edge already listening on :9333. */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const t = list.find(x => x.type === 'page');
  if (!t) throw new Error('no page target: ' + JSON.stringify(list));
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

const EVAL = `JSON.stringify({
  src:(document.getElementById('track')||{}).currentSrc||null,
  t:+(((document.getElementById('track')||{}).currentTime)||0).toFixed(2),
  paused:(document.getElementById('track')||{}).paused,
  muted:(document.getElementById('track')||{}).muted,
  vol:(document.getElementById('track')||{}).volume,
  netState:(document.getElementById('track')||{}).networkState,
  jserr:document.documentElement.dataset.jsError||'',
  dbg:document.documentElement.dataset.dbg||''
})`;

(async () => {
  const { ws, ready, send } = connect(await target());
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');

  /* ---- control: a plain <audio>, no WebAudio ---------------------------------- */
  await send('Page.navigate', { url: 'http://127.0.0.1:8899/_pv/plain.html' });
  await sleep(2500);
  let r = await send('Runtime.evaluate', { expression: EVAL, returnByValue: true });
  console.log('CONTROL plain <audio>  :', r.result.result.value);

  /* ---- subject: the PV page, started with a real click on the gate ------------ */
  await send('Page.navigate', { url: 'http://127.0.0.1:8899/pv.html?dbg=1' });
  await sleep(2500);
  const vp = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({w:innerWidth,h:innerHeight})', returnByValue: true });
  console.log('viewport               :', vp.result.result.value);
  const { w, h } = JSON.parse(vp.result.result.value);
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  await sleep(1000);
  r = await send('Runtime.evaluate', {
    expression: "JSON.stringify({gateGone:document.getElementById('gate').classList.contains('gone')," +
      "btn:document.getElementById('btnPlay').textContent, btnMute:document.getElementById('btnMute').textContent})",
    returnByValue: true });
  console.log('after click            :', r.result.result.value);
  await sleep(4000);
  r = await send('Runtime.evaluate', { expression: EVAL, returnByValue: true });
  console.log('SUBJECT pv.html (4s)   :', r.result.result.value);
  await sleep(3000);
  r = await send('Runtime.evaluate', { expression: EVAL, returnByValue: true });
  console.log('SUBJECT pv.html (7s)   :', r.result.result.value);

  /* ---- file:// : opened straight off disk (what a double-click does) ---------- */
  await send('Page.navigate', { url: 'file:///D:/deepseek%E5%8F%91%E6%8C%A5/yz/pv.html?dbg=1' });
  await sleep(2500);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
  await sleep(4000);
  r = await send('Runtime.evaluate', { expression: EVAL, returnByValue: true });
  console.log('SUBJECT file:// (4s)   :', r.result.result.value);
  ws.close();
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });

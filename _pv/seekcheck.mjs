const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://127.0.0.1:8899/pv.html?t=40&dbg=1';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t = list.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
await new Promise(r => ws.addEventListener('open', r));
const send = (method, params) => new Promise(res => {
  const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} }));
});
await send('Page.enable'); await send('Runtime.enable');
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

await send('Page.navigate', { url });
await sleep(2500);
console.log('before click :', await ev("document.documentElement.dataset.dbg"));
console.log('track        :', await ev("JSON.stringify({t:document.getElementById('track').currentTime,rs:document.getElementById('track').readyState,dur:document.getElementById('track').duration})"));

/* isolate: does a plain seek stick? */
await ev("document.getElementById('track').currentTime = 40");
await sleep(400);
console.log('manual seek  :', await ev("JSON.stringify({t:document.getElementById('track').currentTime,seek:document.getElementById('track').seeking})"));
await ev("document.getElementById('track').currentTime = 0");
await sleep(300);

for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
  await send('Input.dispatchMouseEvent', { type, x: 400, y: 300, button: 'left', clickCount: 1 });
await sleep(300);
console.log('just after   :', await ev("document.documentElement.dataset.dbg"));
console.log('track        :', await ev("JSON.stringify({t:document.getElementById('track').currentTime,rs:document.getElementById('track').readyState,seek:document.getElementById('track').seeking})"));
await sleep(2000);
console.log('after 2.3s   :', await ev("document.documentElement.dataset.dbg"));
console.log('track        :', await ev("JSON.stringify({t:document.getElementById('track').currentTime,err:document.getElementById('track').error&&document.getElementById('track').error.code})"));
ws.close(); process.exit(0);

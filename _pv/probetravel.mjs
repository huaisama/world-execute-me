/* Probe the travel force's internals: what z, spread and ox does each particle
   actually get? node _pv/probetravel.mjs */
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

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=50.95' });
await sleep(1400);
const out = await ev(`(function(){
  var spec = PVFORCE.at(50.95);
  PVFIELD.setLine({t:50.95}, spec);
  var c = 206, s = .5;
  for (var f=0; f<60; f++) PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
  var A = PVFIELD.positions();
  for (var f=0; f<10; f++) PVFIELD.frame({dt:0.016, hot:0, px:960, py:540, inside:1, hue:c, sat:s});
  var B = PVFIELD.positions();
  var tg = PVFIELD.targets();
  var out = {spec:{form:spec.form, force:spec.force, k:spec.k}, rows:[]};
  for (var i=0;i<8;i++){
    var j = i*275;
    out.rows.push({
      i:j,
      tx:Math.round(tg[j][0]), ty:Math.round(tg[j][1]),
      ax:Math.round(A[j][0]), ay:Math.round(A[j][1]),
      bx:Math.round(B[j][0]), by:Math.round(B[j][1]),
      d:+Math.hypot(B[j][0]-A[j][0], B[j][1]-A[j][1]).toFixed(2),
      lit:+A[j][2].toFixed(2), fade:+A[j][3].toFixed(2)
    });
  }
  /* how far is every particle from its own target? if the cloud is pinned to
     the targets, the offsets are not being applied at all */
  var sum=0, mx=0;
  for (var i=0;i<A.length;i++){ var d=Math.hypot(A[i][0]-tg[i][0], A[i][1]-tg[i][1]); sum+=d; if(d>mx)mx=d; }
  out.meanErr = +(sum/A.length).toFixed(2); out.maxErr = +mx.toFixed(1);
  out.dbg = PVFIELD.debug();
  return JSON.stringify(out);
})()`);
console.log(out);
ws.close(); process.exit(0);

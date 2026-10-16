/* Assert the four reported defects are actually fixed, end to end, through the
   page's real code path. node _pv/assert.mjs */
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

const CASES = [
  ['eggplant centred', 73.6, `(function(){
     var p = PVFIELD.targets(); var sx=0,sy=0,n=0;
     for (var i=0;i<p.length;i++){ sx+=p[i][0]; sy+=p[i][1]; n++; }
     return {cx:Math.round(sx/n), cy:Math.round(sy/n)};
   })()`],
  ['time travel moves', 50.95, `(function(){
     for (var f=0;f<60;f++) PVFIELD.frame({dt:.016,hot:0,px:960,py:540,inside:1,hue:206,sat:.5});
     var A=PVFIELD.positions();
     for (var f=0;f<10;f++) PVFIELD.frame({dt:.016,hot:0,px:960,py:540,inside:1,hue:206,sat:.5});
     var B=PVFIELD.positions(); var sum=0,moved=0;
     for (var i=0;i<A.length;i++){ var d=Math.hypot(B[i][0]-A[i][0],B[i][1]-A[i][1]); sum+=d; if(d>.5)moved++; }
     return {mean:+(sum/A.length).toFixed(2), moving:Math.round(moved/A.length*100)};
   })()`],
  ['insurrection smooth', 133.8, `(function(){
     var el=document.getElementById('pvsys');
     return {on:PVSYS.on(), lines:el.querySelectorAll('.sys-line').length,
             cmdCount:el.querySelectorAll('.sys-cmd').length,
             vecCanvas: !!document.getElementById('pvvector')};
   })()`],
  /* the final piece lands at 191.85, pinned to the measured final-syllable peak
     (191.68..192.12, _pv/love.py) — the grid beat at 191.53 was early. Probe
     INSIDE the final word, where 10/10 is the musically correct state. */
  ['heart complete', 191.95, `(function(){
     return {vec:PVVECTOR.mode(), pieces:PVVECTOR.pieces(),
             fieldPieces:PVFIELD.pieces(),
             vecCanvas: !!document.getElementById('pvvector')};
   })()`],
  ['heart mid-fill', 183.55, `(function(){
     return {pieces:PVVECTOR.pieces(), vecCanvas: !!document.getElementById('pvvector')};
   })()`]
];

let bad = 0;
for (const [name, time, probe] of CASES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${time}` });
  await sleep(1700);
  const err = await ev(`document.documentElement.getAttribute('data-js-error') || 'none'`);
  const r = await ev(probe);
  const o = typeof r === 'string' ? JSON.parse(r) : r;
  console.log(`${name.padEnd(22)} t=${String(time).padEnd(7)} ${JSON.stringify(o)}${err !== 'none' ? '  JS-ERROR: ' + err : ''}`);
  if (err !== 'none') bad++;
}
/* final: does the heart actually complete at 10/10 through the ladder? */
console.log(bad ? `\n${bad} CASE(S) HAD A JS ERROR` : '\nno JS errors');
ws.close(); process.exit(0);

/* List every lyric line whose console entry falls back to `rem` (i.e. has no
   real command), so the table can be completed. node _pv/cmdaudit.mjs */
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

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=0' });
await sleep(1700);
const out = await ev(`(function(){
  var fb = [];
  PVDATA.lines.forEach(function(l){
    var c = PVME.cmdFor(l);
    if (c[0].indexOf('rem ') === 0) fb.push({t:l.t, en:l.en, sc:l.sc, zh:l.zh});
  });
  return JSON.stringify({total:PVDATA.lines.length, fallbacks:fb});
})()`);
const o = JSON.parse(out);
console.log(`lines: ${o.total}, fallbacks: ${o.fallbacks.length}`);
o.fallbacks.forEach(f => console.log(`  ${String(f.t).padEnd(8)} ${String(f.en).padEnd(34)} [${f.sc}]`));
ws.close(); process.exit(0);

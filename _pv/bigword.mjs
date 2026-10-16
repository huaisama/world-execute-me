/* Is the big word actually rendering where the score says it should?
   node _pv/bigword.mjs */
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

/* every beat whose score carries a `big` word */
await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=1' });
await sleep(1500);
const list1 = await ev(`JSON.stringify(PVFORCE.all.filter(function(e){return e[5]&&e[5].big;}).map(function(e){return e[0];}))`);
const bigTimes = JSON.parse(list1);
console.log('beats with a big word:', bigTimes.join(', '));

let missing = 0;
for (const tt of bigTimes) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${(tt + 0.2).toFixed(2)}` });
  await sleep(1500);
  const r = await ev(`(function(){
    var b = document.querySelector('.ft-big');
    var spec = PVFORCE.at(${(tt + 0.2).toFixed(2)});
    return JSON.stringify({
      want: spec.txt ? spec.txt.big : null,
      got: b ? b.textContent : null,
      cls: b ? b.className : null,
      vis: b ? getComputedStyle(b).opacity : null,
      idx: PVIDX(), clock: +PVCLOCK().toFixed(2)
    });
  })()`);
  const o = JSON.parse(r);
  const ok = o.want && o.got === o.want;
  if (!ok) missing++;
  console.log(`t=${String(tt).padEnd(7)} want=${String(o.want).padEnd(20)} got=${String(o.got).padEnd(20)} idx=${o.idx}${ok ? '' : '   <-- MISSING/WRONG'}`);
}
console.log(missing ? `\n${missing} PROBLEM(S)` : '\nall big words render');
ws.close(); process.exit(0);

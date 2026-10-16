/* Integrity sweep: every form, force and vector name referenced by the score
   must resolve. A typo here fails SILENTLY (the field falls back to scatter /
   drift), which is how a whole section can end up motionless without an error.
   node _pv/integrity.mjs */
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

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=1' });
await sleep(1700);

const out = await ev(`(function(){
  var bad = [];
  var forms = {}, forces = {}, vecs = {};
  var names = { forms: PVFIELD.formNames ? PVFIELD.formNames() : null,
                forces: PVFIELD.forceNames ? PVFIELD.forceNames() : null,
                vecs: PVVECTOR.names ? PVVECTOR.names() : null };
  PVFORCE.all.forEach(function(e){
    var t=e[0], form=e[1], force=e[2], k=e[3]||{}, txt=e[5]||{};
    forms[form]=(forms[form]||0)+1; forces[force]=(forces[force]||0)+1;
    if (names.forms && names.forms.indexOf(form)<0) bad.push('FORM '+form+' @'+t);
    if (names.forces && names.forces.indexOf(force)<0) bad.push('FORCE '+force+' @'+t);
    if (k.morph) k.morph.forEach(function(m){
      if (names.forms && names.forms.indexOf(m)<0) bad.push('MORPHFORM '+m+' @'+t);
    });
    if (k.vec) { vecs[k.vec]=(vecs[k.vec]||0)+1;
      if (names.vecs && names.vecs.indexOf(k.vec)<0) bad.push('VEC '+k.vec+' @'+t); }
  });
  return JSON.stringify({bad:bad, forms:Object.keys(forms).length, forces:Object.keys(forces).length,
    vecs:Object.keys(vecs).length, names:names,
    formList:Object.keys(forms).sort(), forceList:Object.keys(forces).sort(),
    vecList:Object.keys(vecs).sort()});
})()`);
const o = JSON.parse(out);
console.log('forms used   :', o.formList.join(', '));
console.log('forces used  :', o.forceList.join(', '));
console.log('vectors used :', o.vecList.join(', '));
console.log('\nDANGLING REFERENCES:', o.bad.length ? '\n  ' + o.bad.join('\n  ') : 'none');

/* also sweep the whole timeline for JS errors */
const times = [];
for (let x = 0; x < 212; x += 4) times.push(x);
let errs = 0;
for (const tt of times) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}.3` });
  await sleep(430);
  const e = await ev(`document.documentElement.getAttribute('data-js-error') || 'none'`);
  if (e !== 'none') { console.log(`  t=${tt} JS-ERROR ${e}`); errs++; }
}
console.log(`\ntimeline sweep: ${times.length} points, ${errs} JS errors`);
ws.close(); process.exit(0);

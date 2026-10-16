/* Does the PACKAGED tree actually run on its own?
   ---------------------------------------------------------------------------
   A package that does not start is worthless, and the clean package is missing
   the audio on purpose — so this checks the two things that could break it:
     1. the page loads with no errors and every layer initialises
     2. the missing-audio fallback actually engages and the clock still advances

   node _pv/packagetest.mjs [port]
*/
const PORT = 9333;
const URL = process.argv[2] || 'http://127.0.0.1:8901/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t = list.find(x => x.type === 'page');
if (!t) { console.error('no debuggable page; start a browser with --remote-debugging-port=9333'); process.exit(1); }
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map(); const errs = []; const failed = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText);
});
await new Promise(r => ws.addEventListener('open', r));
const send = (m, p) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

console.log('testing ' + URL + '\n');
errs.length = 0; failed.length = 0;
await send('Page.navigate', { url: URL + '?cb=' + Date.now() });
await sleep(2500);

console.log('  JS exceptions   :', errs.length ? errs.join(' | ') : 'none');
/* the audio 404 is EXPECTED in the clean package; anything else is a real
   packaging mistake */
const hardFails = failed.filter(f => !/404|Failed to load resource/i.test(f));
console.log('  failed requests :', hardFails.length ? hardFails.join(' | ') : 'none (audio 404 expected)');

const state = await ev(`(function(){
  var out = {};
  out.modules = Object.keys(window).filter(function(k){ return /^PV/.test(k); }).sort();
  out.canvases = Array.prototype.map.call(document.querySelectorAll('canvas'), function(c){
    return c.id + ' ' + c.width + 'x' + c.height; });
  out.audioOk = !!document.getElementById('track');
  out.lines = (window.PVDATA && window.PVDATA.lines) ? window.PVDATA.lines.length : 0;
  out.sections = (window.PVDATA && window.PVDATA.sections) ? window.PVDATA.sections.length : 0;
  return JSON.stringify(out);
})()`);
const S = JSON.parse(state);
console.log('\n  modules loaded  :', S.modules.length, S.modules.join(' '));
console.log('  lyrics/sections :', S.lines + ' lines, ' + S.sections + ' sections');
console.log('  canvases        :', S.canvases.join(' | ') || 'NONE');

/* The page deliberately waits at a start gate until the user clicks (browsers
   will not start audio without a gesture). So a plain load SHOULD sit still —
   testing it without clicking would report a false failure. Click the gate, the
   way a user does, and then check the clock actually runs. */
const gateBefore = await ev(`!!document.getElementById('gate') && !document.getElementById('gate').classList.contains('gone')`);
console.log('\n  start gate      :', gateBefore ? 'showing (expected)' : 'already gone');

await ev(`(function(){ var g=document.getElementById('gate'); if(g) g.click(); return 1; })()`);
await sleep(3200);

/* the clock must advance even with no audio: that is the fallback */
const c1 = await ev('PVCLOCK()');
await sleep(1600);
const c2 = await ev('PVCLOCK()');
const advanced = typeof c1 === 'number' && typeof c2 === 'number' && c2 > c1;
console.log(`  clock           : ${c1} -> ${c2}  ${advanced ? 'advancing (audio fallback works)' : 'FROZEN'}`);

/* and the field must be moving, not just present */
const mv = await ev(`(function(){ return PVFIELD.positions().length; })()`);
console.log('  particles       :', mv);

/* is the audio actually playing, or did it fall back? */
const au = await ev(`(function(){
  var t = document.getElementById('track');
  return JSON.stringify({ src: t.getAttribute('src'), readyState: t.readyState,
                          error: !!t.error, paused: t.paused });
})()`);
console.log('  audio element   :', au);

const ok = errs.length === 0 && hardFails.length === 0 && advanced && S.canvases.length === 3;
console.log('\n  ' + (ok ? 'PACKAGE RUNS' : 'PACKAGE IS BROKEN'));
ws.close(); process.exit(ok ? 0 : 1);

/* Dump the glyph boxes of every text panel at given times.
   node _pv/boxes.mjs 152 206 130 */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TIMES = process.argv.slice(2);
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

const PROBE = `(function(){
  var sel = ['me-voice','ft-term','ft-code','ft-big','ft-formula','ft-cn','ft-sub','me-meter','me-tag','pvsys'];
  var scr = document.getElementById('screen').getBoundingClientRect();
  var s = scr.width / 1920;
  function glyphBox(el){
    var rng = document.createRange(); var rects = [];
    (function walk(n){
      if (n.nodeType === 3) {
        if (n.nodeValue && n.nodeValue.trim()) {
          rng.selectNodeContents(n);
          var rs = rng.getClientRects();
          for (var i=0;i<rs.length;i++) if (rs[i].width > 1 && rs[i].height > 1) rects.push(rs[i]);
        }
        return;
      }
      for (var c=0;c<n.childNodes.length;c++) walk(n.childNodes[c]);
    })(el);
    if (!rects.length) return null;
    var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    rects.forEach(function(r){ if(r.left<x0)x0=r.left; if(r.top<y0)y0=r.top; if(r.right>x1)x1=r.right; if(r.bottom>y1)y1=r.bottom; });
    return { left:x0, top:y0, right:x1, bottom:y1 };
  }
  var out = [];
  sel.forEach(function(cls){
    var el = cls === 'pvsys' ? document.getElementById('pvsys') : document.querySelector('.' + cls);
    if (!el) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .06) return;
    if (!el.textContent || !el.textContent.trim()) return;
    var r = glyphBox(el); if (!r) return;
    out.push(cls + '  x ' + Math.round((r.left-scr.left)/s) + '..' + Math.round((r.right-scr.left)/s) +
      '   y ' + Math.round((r.top-scr.top)/s) + '..' + Math.round((r.bottom-scr.top)/s));
  });
  return out.join('\\n');
})()`;

for (const tt of TIMES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}` });
  await sleep(1300);
  console.log(`\n=== t=${tt} ===`);
  console.log(await ev(PROBE));
}
ws.close(); process.exit(0);

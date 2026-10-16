/* Why does the sweep report ft-big x pvsys overlap when boxes.mjs shows none?
   Measure both ways at the SAME time with the SAME wait, and disable cache.
   node _pv/whichboxtruth.mjs 136 */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tt = process.argv[2] || '136';
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
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

const PROBE = `(function(){
  function box(el){ var r = el.getBoundingClientRect(); return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; }
  function glyph(el){
    var rng = document.createRange(); var rects = [];
    (function walk(n){
      if (n.nodeType === 3) {
        if (n.nodeValue && n.nodeValue.trim()) {
          rng.selectNodeContents(n);
          var rs = rng.getClientRects();
          for (var i=0;i<rs.length;i++) if (rs[i].width>1&&rs[i].height>1) rects.push(rs[i]);
        }
        return;
      }
      for (var c=0;c<n.childNodes.length;c++) walk(n.childNodes[c]);
    })(el);
    if (!rects.length) return null;
    var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    rects.forEach(function(r){ if(r.left<x0)x0=r.left; if(r.top<y0)y0=r.top; if(r.right>x1)x1=r.right; if(r.bottom>y1)y1=r.bottom; });
    return {x:Math.round(x0),y:Math.round(y0),w:Math.round(x1-x0),h:Math.round(y1-y0)};
  }
  var b = document.querySelector('.ft-big');
  var p = document.getElementById('pvsys');
  var cs = b ? getComputedStyle(b) : null;
  return JSON.stringify({
    bigBox:  b ? box(b) : null,
    bigGlyph: b ? glyph(b) : null,
    bigText: b ? b.textContent : null,
    bigTop: cs ? cs.top : null,
    bigFont: cs ? cs.fontSize : null,
    bigAnim: cs ? cs.animationName : null,
    bigTransform: cs ? cs.transform : null,
    pvsysBox: p ? box(p) : null,
    pvsysGlyph: p ? glyph(p) : null,
    pvsysTop: p ? getComputedStyle(p).top : null,
    pvsysOn: p ? p.className : null
  });
})()`;

for (const wait of [340, 1300]) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}` });
  await sleep(wait);
  console.log(`\n--- wait ${wait}ms ---`);
  console.log(await ev(PROBE));
}
ws.close(); process.exit(0);

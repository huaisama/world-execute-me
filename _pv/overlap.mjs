/* Detect overlapping text panels across the whole song.
   The watcher's console, the deletion terminal, the insurrection terminal, the
   code log and the big word are all absolutely-positioned layers, and nothing
   stops two of them from occupying the same pixels — which is exactly how the
   CMD window ended up drawn on top of the watcher's log, twice.
   node _pv/overlap.mjs */
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

/* every panel that carries text and can appear over the field */
const times = [];
for (let x = 0; x < 212; x += 2) times.push(x);

const PROBE = `(function(){
  /* The stage is scaled, so measure in STAGE units.
     CRUCIAL: for centred text (.ft-big has left:0;right:0;text-align:center)
     the element BOX spans the whole stage while its glyphs occupy a small band
     in the middle. Comparing boxes therefore reports "the big word covers the
     affection meter" at 100% when nothing is actually touching. So for text we
     take the UNION OF THE GLYPH RECTS via a Range, which is what gets drawn. */
  var sel = [
    ['me-voice',  function(){ return document.querySelector('.me-voice'); }],
    ['ft-term',   function(){ return document.querySelector('.ft-term'); }],
    ['ft-code',   function(){ return document.querySelector('.ft-code'); }],
    ['ft-big',    function(){ return document.querySelector('.ft-big'); }],
    ['ft-formula',function(){ return document.querySelector('.ft-formula'); }],
    ['ft-cn',     function(){ return document.querySelector('.ft-cn'); }],
    ['ft-sub',    function(){ return document.querySelector('.ft-sub'); }],
    ['pvsys',     function(){ return document.getElementById('pvsys'); }],
    ['me-meter',  function(){ return document.querySelector('.me-meter'); }],
    ['me-tag',    function(){ return document.querySelector('.me-tag'); }]
  ];
  var scr = document.getElementById('screen').getBoundingClientRect();
  var s = scr.width / 1920;

  /* union of the client rects of every text node inside el */
  function glyphBox(el){
    var rng = document.createRange();
    var rects = [];
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
    rects.forEach(function(r){
      if (r.left<x0)x0=r.left; if (r.top<y0)y0=r.top;
      if (r.right>x1)x1=r.right; if (r.bottom>y1)y1=r.bottom;
    });
    return { left:x0, top:y0, right:x1, bottom:y1 };
  }

  var out = [];
  sel.forEach(function(pair){
    var el = null;
    try { el = pair[1](); } catch(e){}
    if (!el) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .06) return;
    if (!el.textContent || !el.textContent.trim()) return;
    var r = glyphBox(el);
    if (!r) return;
    out.push({ n: pair[0],
      x: Math.round((r.left - scr.left) / s), y: Math.round((r.top - scr.top) / s),
      w: Math.round((r.right - r.left) / s), h: Math.round((r.bottom - r.top) / s) });
  });
  function ov(a, b){
    var x = Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x));
    var y = Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
    return x * y;
  }
  var hits = [];
  for (var i=0;i<out.length;i++) for (var j=i+1;j<out.length;j++){
    var a = out[i], b = out[j];
    var ar = ov(a,b);
    if (ar <= 0) continue;
    var smaller = Math.min(a.w*a.h, b.w*b.h);
    hits.push({ a:a.n, b:b.n, px:ar, pctOfSmaller: Math.round(ar / smaller * 100) });
  }
  return JSON.stringify({panels: out, hits: hits});
})()`;

const problems = [];
const SKIP = /^(ft-big|ft-formula)/;   /* entrance-animated words, verified below */
for (const tt of times) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}.35` });
  /* Wait for the ENTRANCE ANIMATIONS to finish. `.ft-big` uses ftHit, which
     starts at scale(1.16); measuring during it inflated the glyph box from
     124px to 288px tall and produced overlaps that do not exist once the word
     has settled. A 340ms wait was measuring the animation, not the layout. */
  await sleep(1500);
  const raw = await ev(PROBE);
  if (!raw) continue;
  const o = JSON.parse(raw);
  for (const h of o.hits) {
    if (h.pctOfSmaller < 8) continue;
    if (SKIP.test(h.a) || SKIP.test(h.b)) continue;
    problems.push({ t: tt, ...h });
  }
}
/* now check the animated words separately, once settled */
console.log('--- settled checks (entrance animations finished) ---');
for (const tt of [134, 140, 152, 206]) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${tt}.35` });
  await sleep(1500);
  const raw = await ev(PROBE);
  if (raw) {
    const o = JSON.parse(raw);
    const rel = o.hits.filter(h => /^(ft-big|ft-formula)/.test(h.a) || /^(ft-big|ft-formula)/.test(h.b));
    console.log(`  t=${tt}: ${rel.length ? rel.map(h => `${h.a}x${h.b} ${h.pctOfSmaller}%`).join(', ') : 'clean'}`);
  }
}
if (!problems.length) console.log('no panel overlaps detected across the timeline');
else {
  console.log(`${problems.length} OVERLAP(S):`);
  const seen = new Set();
  for (const p of problems) {
    const k = p.a + '|' + p.b;
    const tag = seen.has(k) ? '' : ' (new pair)';
    seen.add(k);
    console.log(`  t=${String(p.t).padEnd(4)} ${p.a} x ${p.b}  ${p.px}px²  ${p.pctOfSmaller}% of the smaller${tag}`);
  }
}
ws.close(); process.exit(0);

/* Dump the field's real target positions as ASCII, so a shape can be verified
   as it will actually be drawn. node _pv/dumpfield.mjs <url> */
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=186.4';

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

await send('Page.navigate', { url });
await sleep(2600);

const dump = await ev(`(function(){
  var d = PVFIELD.debug();
  var pts = PVFIELD.targets ? PVFIELD.targets() : null;
  return JSON.stringify({dbg:d, n: pts?pts.length:0, sample: pts?pts.slice(0,4):null});
})()`);
console.log(dump);

const probe = await ev(`JSON.stringify({
  host: !!document.getElementById('pvSysHost'),
  sys: !!document.getElementById('pvsys'),
  cls: (document.getElementById('pvsys')||{}).className,
  disp: document.getElementById('pvsys') ? getComputedStyle(document.getElementById('pvsys')).display : 'n/a',
  lines: (document.getElementById('pvsys')||{querySelectorAll:()=>[]}).querySelectorAll('.sys-line').length,
  pvsysFn: typeof window.PVSYS
})`);
console.log('PROBE', probe);

const spec = await ev(`(function(){
  var t = 131.5;
  var s = PVFORCE.at(t);
  var ln = null, all = PVDATA.lines;
  for (var i=0;i<all.length;i++) if (all[i].t <= t + .001) ln = all[i];
  return JSON.stringify({
    specT: s && s.t, specForce: s && s.force,
    hasSys: !!(s && s.txt && s.txt.sys),
    sysLen: s && s.txt && s.txt.sys ? s.txt.sys.length : 0,
    lineT: ln && ln.t, lineKeep: ln && ln.keep, lineSc: ln && ln.sc,
    nextT: all[all.indexOf(ln)+1] ? all[all.indexOf(ln)+1].t : null
  });
})()`);
console.log('SPEC', spec);

const call = await ev(`(function(){
  var s = PVFORCE.at(131.5);
  try {
    PVSYS.setLine(s);
    var el = document.getElementById('pvsys');
    return JSON.stringify({
      ok: true,
      cls: el.className,
      disp: getComputedStyle(el).display,
      lines: el.querySelectorAll('.sys-line').length,
      html: el.innerHTML.length
    });
  } catch (e) { return 'THREW: ' + e.message + ' | ' + e.stack; }
})()`);
console.log('CALL', call);

const shape = await ev(`(function(){
  var s = PVFORCE.at(131.5);
  return JSON.stringify({
    t: s.t, force: s.force,
    kKeys: Object.keys(s.k || {}),
    kSys: s.k && s.k.sys ? 'IN k' : 'not in k',
    txtKeys: Object.keys(s.txt || {}),
    txtSys: s.txt && s.txt.sys ? s.txt.sys.length : 'no txt.sys'
  });
})()`);
console.log('SHAPE', shape);

/* render the target cloud as ASCII 96x40 over the stage */
const art = await ev(`(function(){
  var pts = PVFIELD.targets();
  var W=96,H=40,grid=[];
  for(var y=0;y<H;y++){grid.push(new Array(W).fill(0));}
  for(var i=0;i<pts.length;i++){
    var p=pts[i]; if(!p) continue;
    var gx=Math.round(p[0]/1920*(W-1)), gy=Math.round(p[1]/1080*(H-1));
    if(gx>=0&&gx<W&&gy>=0&&gy<H) grid[gy][gx]++;
  }
  var out=[];
  for(var y=0;y<H;y++){var s='';for(var x=0;x<W;x++){var v=grid[y][x];s+= v?(v>3?'#':v>1?'+':'.'):' ';}out.push(s);}
  return out.join('\\n');
})()`);
console.log(art);
ws.close(); process.exit(0);

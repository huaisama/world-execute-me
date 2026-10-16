/* Measure the target cloud for a list of times: centroid, bbox, coverage.
   Answers "is it centred?" and "is it filled?" with numbers, not eyes.
   node _pv/measure.mjs 73.6 77.3 186.4 191.5 */
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

for (const time of TIMES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html?sim=1&still=1&t=${time}` });
  await sleep(1400);
  const out = await ev(`(function(){
    var t = parseFloat('${time}');
    var spec = window.PVFORCE ? PVFORCE.at(t) : null;
    if (window.PVFIELD) PVFIELD.setLine({t:t}, spec);
    var pts = PVFIELD.targets() || [];
    var n=0,sx=0,sy=0,minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;
    var wedges={};
    for (var i=0;i<pts.length;i++){
      var p=pts[i]; if(!p) continue;
      n++; sx+=p[0]; sy+=p[1];
      if(p[0]<minx)minx=p[0]; if(p[0]>maxx)maxx=p[0];
      if(p[1]<miny)miny=p[1]; if(p[1]>maxy)maxy=p[1];
      if(p[2]!=null) wedges[p[2]]=(wedges[p[2]]||0)+1;
    }
    /* coverage of the bbox by a 24x14 grid — a hollow outline covers far less
       than a filled silhouette at the same bbox */
    var GW=24,GH=14,cell={},filled=0;
    for (var i=0;i<pts.length;i++){
      var p=pts[i]; if(!p) continue;
      var gx=Math.min(GW-1,Math.floor((p[0]-minx)/((maxx-minx)||1)*GW));
      var gy=Math.min(GH-1,Math.floor((p[1]-miny)/((maxy-miny)||1)*GH));
      var k=gx+','+gy; if(!cell[k]){cell[k]=1;filled++;}
    }
    return JSON.stringify({
      t:t, form:spec&&spec.form, force:spec&&spec.force,
      n:n, cen:[Math.round(sx/n),Math.round(sy/n)],
      bbox:[Math.round(minx),Math.round(miny),Math.round(maxx),Math.round(maxy)],
      size:[Math.round(maxx-minx),Math.round(maxy-miny)],
      cov:(filled/(GW*GH)*100).toFixed(0)+'%',
      wedges:wedges
    });
  })()`);
  console.log(out);
}
ws.close(); process.exit(0);

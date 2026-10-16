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
const ev = async ex => {
  const r = await send('Runtime.evaluate', { expression: ex, returnByValue: true });
  return r.result && r.result.exceptionDetails ? 'THREW: ' + JSON.stringify(r.result.exceptionDetails.text) : (r.result.result.value);
};
await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?t=7.6&dbg=1' });
await sleep(3000);
console.log('js-error   :', await ev("document.documentElement.dataset.jsError || '(none)'"));
console.log('field      :', await ev("window.PVFIELD ? JSON.stringify({enabled:PVFIELD.enabled, form:PVFIELD.form(), force:PVFIELD.force()}) : 'no PVFIELD'"));
console.log('canvas     :', await ev("(function(){var c=document.querySelector('#stage canvas');return c? c.width+'x'+c.height : 'NO CANVAS';})()"));
console.log('lit pixels :', await ev("(function(){var c=document.querySelector('#stage canvas');if(!c)return 'n/a';var g=c.getContext('2d');var d=g.getImageData(0,0,c.width,c.height).data;var n=0;for(var i=3;i<d.length;i+=4*53)if(d[i]>12)n++;return n;})()"));
console.log('force spec :', await ev("JSON.stringify(PVFORCE.at(7.6))"));
console.log('dbg        :', await ev("document.documentElement.dataset.dbg"));
console.log('drive once :', await ev("(function(){try{for(var i=0;i<200;i++)PVFIELD.frame({dt:0.016,hot:0,px:960,py:540,inside:1,hue:206,sat:0.6});var c=document.querySelector('#stage canvas');var g=c.getContext('2d');var d=g.getImageData(0,0,c.width,c.height).data;var n=0;for(var j=3;j<d.length;j+=4*53)if(d[j]>12)n++;return 'ok lit='+n}catch(e){return 'THREW '+e.message}})()"));
console.log('debug      :', await ev("JSON.stringify(PVFIELD.debug())"));
ws.close(); process.exit(0);

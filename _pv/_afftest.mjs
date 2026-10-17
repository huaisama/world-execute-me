const PORT=9333;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t=list.find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl);
let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
await new Promise(r=>ws.addEventListener('open',r));
const send=(m,p)=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
const ev=async ex=>{const r=await send('Runtime.evaluate',{expression:ex,returnByValue:true});return r.result.result.value;};
async function test(url,label){
  await send('Page.navigate',{url:url+'&cb='+Date.now()});
  await sleep(3000);
  const a1 = await ev('PVME.aff()');
  await sleep(9000);   // long past the 6s idle threshold
  const a2 = await ev('PVME.aff()');
  console.log(`  ${label.padEnd(22)} 3s后 ${a1}  12s后 ${a2}  ${Math.abs(a2-a1)>2?'衰减 ✗':'保持 ✓'}`);
}
console.log('=== 无 aff 参数（模拟录屏，鼠标不动）===');
await test('http://127.0.0.1:8899/?sim=1&still=1&t=150','默认');
console.log('=== 带 ?aff=100 ===');
await test('http://127.0.0.1:8899/?sim=1&still=1&t=150&aff=100','aff=100');
ws.close();process.exit(0);

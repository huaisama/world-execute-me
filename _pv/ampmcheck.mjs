/* Verify the AM/PM pin.
   The hand must cross twelve o'clock (sweep = 0) exactly on the measured "P"
   accent at 94.90, be in the AM half before it and the PM half after, and both
   layers must agree because they read the same function.

   node _pv/ampmcheck.mjs
*/
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
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result.result.value;

await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=90&cb=' + Date.now() });
await sleep(2200);

const raw = await ev(`(function(){
  var out = [];
  for (var t = 93.40; t <= 95.60; t += 0.05) {
    PVSEEK(t);
    /* the FIELD keeps its own clock, and dialSweep() reads that one. PVSEEK
       only moves the driver's clock, so the field has to be stepped forward to
       the same moment — exactly as the real loop does when it passes a time. */
    PVFIELD.step(1/300, { hue: 300, sat: .4, time: t });
    var sweep = PVFIELD.dialSweep();
    var amp = PVFIELD.dialAmPm();
    /* unwrap to -0.5..0.5 so 0 is unambiguously twelve o'clock */
    var u = sweep > 0.5 ? sweep - 1 : sweep;
    out.push([+t.toFixed(2), +u.toFixed(4), amp]);
  }
  return JSON.stringify(out);
})()`);
const rows = JSON.parse(raw);

/* where does it cross zero (noon)? */
let cross = null;
for (let i = 1; i < rows.length; i++) {
  const [, a] = rows[i - 1], [, b] = rows[i];
  if (a < 0 && b >= 0) { cross = rows[i][0]; break; }
}
console.log('AM/PM hand sweep across "From AM to PM" (0 = twelve o\'clock)\n');
console.log('   time     hand(turns)   half');
for (const [tt, u, amp] of rows) {
  if (Math.abs(tt * 100 % 20) > 0.5) continue;      /* print every .2s */
  const bar = ' '.repeat(Math.round((u + 0.3) * 60)) + '*';
  console.log(`  ${tt.toFixed(2)}   ${u >= 0 ? ' ' : ''}${u.toFixed(3)}      ${amp === 1 ? 'AM' : amp === 0 ? 'PM' : '--'}   ${bar}`);
}
console.log('\n  measured "P" accent : 94.90');
console.log('  hand crosses noon at:', cross == null ? 'NEVER' : cross.toFixed(2));
const off = cross == null ? 99 : Math.abs(cross - 94.90);
console.log('  offset              :', off.toFixed(2) + 's', off < 0.12 ? 'ok (pinned)' : '<-- NOT PINNED');

/* both layers must read the same numbers */
const agree = await ev(`(function(){
  PVSEEK(94.90);
  PVFIELD.step(1/300, { hue: 300, sat: .4, time: 94.90 });
  return JSON.stringify({ sweep: PVFIELD.dialSweep(), amp: PVFIELD.dialAmPm() });
})()`);
console.log('\n  at 94.90 both layers see:', agree);
ws.close(); process.exit(off < 0.12 ? 0 : 1);

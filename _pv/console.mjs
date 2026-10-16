/* Assert the CMD console is lyric-paced: one entry per sung line, and the
   command matches the lyric. Drives the page through PVSEEK (the real path).
   node _pv/console.mjs */
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

/* walk forward through the song the way playback does, one beat at a time */
await send('Page.navigate', { url: 'http://127.0.0.1:8899/index.html?sim=1&still=1&t=0' });
await sleep(1700);

const out = await ev(`(function(){
  var report = [];
  var times = [0.03, 3.58, 7.19, 17.10, 33.01, 50.95, 52.99, 64.29, 73.53, 88.34, 125.33, 133.80, 147.52, 165.10, 179.90, 191.30];
  times.forEach(function(t){
    /* advance to just before the line, then land on it — exactly what the
       clock does during playback */
    PVSEEK(t - 0.05);
    PVSEEK(t);
    /* drive a couple of frames so the newest entry finishes typing (prime
       sets its cps to 1e6, so one frame completes it) */
    PVME.frame({now: performance.now(), dt: .5, playing:true, bass:0, inside:true});
    PVME.frame({now: performance.now(), dt: .5, playing:true, bass:0, inside:true});
    var v = document.getElementById('meVoice');
    var cmds = v.querySelectorAll('.me-cmd span');
    var outs = v.querySelectorAll('.me-out');
    var last = cmds.length ? cmds[cmds.length-1].textContent : '';
    var lout = outs.length ? outs[outs.length-1].textContent : '';
    var all = PVDATA.lines, ln = null;
    for (var i=0;i<all.length;i++) if (all[i].t <= t + .001) ln = all[i];
    var want = ln ? PVME.cmdFor(ln) : null;
    /* during section 008 the big insurrection terminal owns the frame and this
       column yields on purpose, so an empty console is the CORRECT state */
    var spec = PVFORCE.at(t);
    /* During section 008 the insurrection terminal and during section 009 the
       rd /s /q deletion terminal own the frame; this column yields on purpose
       there, so an empty console is the CORRECT state. */
    var yields = !!(spec && spec.txt && (spec.txt.sys || spec.txt.term));
    report.push({t:t, entries:cmds.length, cmd:last, out:lout, yields:yields,
      matches: (want && !yields) ? (want[0] === last) : null, expected: want ? want[0] : null});
  });
  return JSON.stringify(report);
})()`);
const rows = JSON.parse(out);
let bad = 0;
for (const r of rows) {
  let flag = '';
  if (r.yields) {
    if (r.entries !== 0) flag = '  <-- SHOULD HAVE YIELDED';
  } else if (r.entries === 0) flag = '  <-- EMPTY';
  else if (r.matches === false) flag = '  <-- MISMATCH';
  if (flag) bad++;
  console.log(`t=${String(r.t).padEnd(7)} n=${r.entries}  > ${r.cmd || '(none)'}` +
    `${r.out ? '   :: ' + r.out : ''}${r.yields ? '   [yields to terminal]' : ''}${flag}`);
}
console.log(bad ? `\n${bad} PROBLEM(S)` : '\nall entries present and matching');
ws.close(); process.exit(0);

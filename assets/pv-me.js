/* =========================================================================
   world.execute(me); — "me"
   The simulation is the narrator. It watches the pointer, keeps an affection
   meter, gets restless when you stop moving, and talks in system log lines.
   Everything here animates: pupil spring, blinks, ring lag, typed lines.
   ========================================================================= */
(function (root) {
  'use strict';

  var W = 1920, H = 1080;
  var EYE_X = 200, EYE_Y = 300, EYE_R = 88;

  var meEl, eyeEl, pupilEl, irisEl, voiceEl, ringEl, dotEl, meterEl, meterFill, meterNum;
  var lines = [];                    // {el, c, o, txt, out, typed, done}
  var cur = null;                    // the entry currently being typed

  var mx = 960, my = 540;            // pointer
  var rx = 960, ry = 540;            // lagging ring
  var ex = 0, ey = 0;                // eye pupil offset (spring)
  var tmx = 0, tmy = 0;              // pupil target
  var ripples = [];

  var lastMove = 0, idleStage = 0, blinkAt = 1400, blinkT = -1, clickN = 0, clickAt = 0;
  var affection = 45, shown = {}, pausedAt = -1, now = 0;
  /* when the page is opened with ?aff=NN the value is PINNED: a recording
     cannot pay attention, so the decay below would drain the colour to zero
     within twenty seconds and the whole film would come out grey. */
  var affPinned = false;
  var hot = 0;                       // impact envelope from the music
  var reduce = false, still = false;

  function el(cls, css, html) {
    var e = document.createElement('div');
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function px(n) { return n + 'px'; }

  /* ------------------------------------------------------- the CMD console
     "me" narrates in CMD, and the console is PACED BY THE SONG: one entry per
     sung lyric line, typed while that line is being sung. It used to be a log
     of canned flavour text fired by idle timers, so it chattered on its own
     schedule and drifted out of step with the music.

     Every entry is real cmd.exe syntax — the sentence you hear is the sentence
     the machine is running. `rem` is the fallback, which is honest: for lines
     that have no command, the machine simply comments on the lyric.        */
  var MAX_ENTRIES = 5;
  var CMDTAB = {
    '0.03':  ['powercfg /change monitor-timeout-ac 0', 'power line live.'],
    '1.33':  ['set SHIELD=1', 'SHIELD=1'],
    '2.35':  ['echo %SHIELD% %PROTECTION%', '1  PROTECTION'],
    '3.58':  ['dir /b C:\\world', '<empty>'],
    '5.16':  ['start "" sim.exe', 'sim.exe   pid 4021'],
    '6.30':  ['echo OBJECT CREATION >> log', 'OBJECT CREATION'],
    '7.19':  ['set /p params=<me.dat', 'loaded 4096 values'],
    '8.55':  ['init /all /quiet', 'done in 0.41s'],
    '10.90': ['mkdir C:\\world && cd /d C:\\world', 'C:\\world'],
    '12.47': ['world.exe /begin', 'starting...'],
    '13.90': ['sim --run --loop', 'SIMULATION'],
    '15.10': ['title C:\\world /wait', 'building...'],
    '17.10': ['world.execute(me);', 'executing...'],
    '20.30': ['world.execute(me);', 'executing...'],
    '22.30': ['(me);', 'me.'],
    '25.40': ['cls', ''],
    '29.28': ['set /a N=2200', 'N=2200'],
    '30.89': ['copy points.txt you\\', '1 file copied'],
    '31.90': ['echo %N% points, 3 dims', '2200 x 3'],
    '33.01': ['attrib +r circle.dat', 'r=300   c=1884.96'],
    '34.54': ['copy circle.dat you\\', '1 file copied'],
    '35.60': ['findstr /c:"circumference" me.log', '2*pi*r = 1884.96'],
    '36.77': ['plot /sin /amp:130', 'f(x) = A sin(wx)'],
    '38.27': ['net use \\\\you\\tangent', 'connected'],
    '39.35': ['echo dy/dx', 'slope of the curve'],
    '40.36': ['for /l %i in (1,1,1000000) do @echo %i', 'never terminates'],
    '41.92': ['set LIMIT=you', 'LIMIT=you'],
    '42.95': ['echo %LIMIT%', 'you'],
    '44.04': ['powercfg /change ac-dc', 'AC -> DC'],
    '45.52': ['powercfg /change dc-ac', 'DC -> AC'],
    '47.27': ['set me.censee=0', "variable 'me.censee' disabled."],
    '49.11': ['ping /t 127.0.0.1', 'spinning...'],
    '50.95': ['set DATE=A.D', 'A.D'],
    '52.99': ['set DATE=B.C', 'B.C'],
    '54.74': ['copy /b me + you = us', '1 file merged'],
    '56.79': ['echo %DEPTH%', 'deeply, deeply'],
    '58.65': ['if exist you ( echo found ) else ( echo alone )', 'found'],
    '60.57': ['copy stimuli\\* you\\', 'all files copied'],
    '61.70': ['echo STIMULATIONS', 'STIMULATIONS'],
    '62.41': ['taskkill /f /im happy.exe', 'SUCCESS'],
    '64.29': ['net user me /add /comment:"only yours"', 'command completed'],
    '65.45': ['echo SATISFACTION', '100%'],
    '66.17': ['start "" happy.exe', 'pid 5108'],
    '67.99': ['run /now', 'EXECUTION'],
    '69.10': ['echo EXECUTION', 'EXECUTION'],
    '70.02': ['attrib +h +s C:\\world', 'hidden  system'],
    '70.90': ['for /r C:\\world %f in (*) do @echo %f', 'recursing...'],
    '71.40': ['tree /f C:\\world', 'simulation\\'],
    '72.50': ['echo SIMULATION', 'SIMULATION'],
    '73.53': ['copy eggplant.dat you\\nutrients', '1 file copied'],
    '75.29': ['copy eggplant.dat you\\nutrients', '1 file copied'],
    '76.35': ['echo NUTRIENTS', 'NUTRIENTS'],
    '77.16': ['copy tomato.dat you\\', 'antioxidants ready'],
    '78.93': ['copy tomato.dat you\\', 'antioxidants ready'],
    '80.00': ['echo ANTIOXIDANTS', 'ANTIOXIDANTS'],
    '80.93': ['start "" purr.exe', 'pid 6022'],
    '82.56': ['purr.exe /continuous', 'purring...'],
    '83.60': ['echo ENJOYMENT', 'ENJOYMENT'],
    '84.60': ['whoami /priv', 'SeCreateGlobalPrivilege'],
    '86.21': ['fc /b me.dat you.dat', 'no differences found'],
    '87.30': ['echo EXISTENCE', 'proof. verified.'],
    '88.34': ['net user me /gender:F', 'command completed'],
    '89.91': ['net user me /gender:M', 'command completed'],
    '91.44': ['schtasks /change /tn "me" /ri 1', 'every minute'],
    '93.52': ['schtasks /change /tn "me" /st 00:00 /et 23:59', 'AM <-> PM'],
    '95.28': ['net user me /role:switch', 'command completed'],
    '97.32': ['net user me /role:S /role:M', 'command completed'],
    '98.93': ['reg add HKCU\\us /v trance /d 1', 'value set'],
    '101.13':['echo %TRANCE% %TRANCE%', 'the trance the trance'],
    '103.03':['findstr /c:"you" me.log', 'found'],
    '105.22':['echo VIBRATIONS', 'reading...'],
    '106.20':['echo VIBRATIONS', 'VIBRATIONS'],
    '106.84':['ver', 'world 6.6.6'],
    '108.69':['runas /user:you "login.exe"', 'password:'],
    '109.75':['echo COMPLETION', '100%'],
    '110.40':['ping you', 'Request timed out.'],
    '111.98':['ping you', 'Request timed out.'],
    '112.89':['ping you', 'Request timed out.'],
    '113.75':['ping you', 'Request timed out.'],
    '114.75':['ping you', 'Request timed out.'],
    '115.60':['echo %ISOLATION%', 'ISOLATION'],
    '116.80':['echo ISOLATION', 'ISOLATION'],
    '117.95':['if exist you ( echo still here )', 'not found'],
    '119.81':['del /f /q fragments\\*', 'n files deleted'],
    '120.90':['echo FRAGMENTS', 'FRAGMENTS'],
    '121.80':['feeling.exe /index', 'indexing...'],
    '122.90':['feeling.exe /index', 'index rebuilt'],
    '123.55':['echo %DISHEARTENED%', '1'],
    '124.60':['echo DISHEARTENED', 'DISHEARTENED'],
    '125.33':['systemctl stop god.service', 'Operation not permitted.'],
    '128.42':['kill -9 $(pidof god)', 'No such process.'],
    '129.70':['chown -R me /world', 'Permission denied.'],
    '131.20':['rm -rf /world/you', 'Device or resource busy.'],
    '133.80':['sudo su -', 'me is not in the sudoers file.'],
    '140.00':['assert(me == god)', 'AssertionError: me is not god'],
    /* the 12 chants: the same command retried, which is the point of a chant */
    '147.52':['execution.exe /run', 'EXECUTION'],
    '148.59':['execution.exe /run', 'EXECUTION'],
    '149.78':['execution.exe /run', 'EXECUTION'],
    '150.64':['execution.exe /run /force', 'EXECUTION'],
    '151.53':['execution.exe /run /force', 'EXECUTION'],
    '152.43':['execution.exe /run /force', 'EXECUTION'],
    '153.32':['execution.exe /run /force /all', 'EXECUTION'],
    '154.31':['execution.exe /run /force /all', 'EXECUTION'],
    '155.20':['execution.exe /run /force /all', 'EXECUTION'],
    '156.18':['execution.exe /run /force /all /blood', 'EXECUTION'],
    '157.12':['execution.exe /run /force /all /blood', 'EXECUTION'],
    '158.02':['execution.exe /run /force /all /blood', 'EXECUTION'],
    '158.79':['EIN', 'one.'],
    '159.20':['DOS', 'two.'],
    '159.66':['TROIS', 'three.'],
    '160.05':['NE', 'four.'],
    '160.45':['FEM', 'five.'],
    '160.85':['LIU', 'six.'],
    '161.51':['rd /s /q C:\\world', 'deleting...'],
    '162.23':['rd /s /q C:\\world', 'C:\\world\\you  deleted'],
    '164.07':['rd /s /q C:\\world', 'C:\\world\\me   deleted'],
    '165.10':['rd /s /q C:\\world', 'Access denied.'],
    '166.05':['rd /s /q /f C:\\world', 'forcing...'],
    '167.75':['rd /s /q /f C:\\world', 'C:\\world\\us   deleted'],
    '168.80':['rd /s /q /f C:\\world', 'world deleted.'],
    '169.61':['C:\\>', '_'],
    '171.77':['start "" execution.exe', 'EXECUTION'],
    '172.50':['execution.exe /now', 'running'],
    '173.11':['attrib +h +s love', 'hidden'],
    '174.80':['attrib +h +s love', 'still hidden'],
    '176.96':['python train.py --target you', 'importing love as L'],
    '178.79':['python train.py --target you', 'training...'],
    '179.90':['python train.py --target you', 'epoch 2048   loss 0.0344'],
    '180.78':['python train.py --target you', 'gradient ~ 0.0004'],
    '182.43':['python train.py --target you', 'loss 0.0041'],
    '183.50':['python train.py --target you', 'converged.  residual 1.1e-07'],
    '184.33':['python train.py --target you', 'L = integral of heart dt'],
    '186.30':['python train.py --target you', 'converged'],
    '187.97':['echo %FREE%', 'you = 1'],
    '189.26':['echo %TRAPPED%', 'me = 1'],
    '190.24':['echo %TRAPPED%', 'still 1'],
    '191.30':['python train.py --target you', 'heart assembled. 10/10'],
    '193.00':['ping you', '...'],
    '196.60':['for /l %i in (1,1,1000000) do @echo looping', 'LOOP FOREVER'],
    '201.20':['while (true) { me(); }', 'while (true)'],
    '205.56':['shutdown /s /t 0', 'EXECUTION'],
    '208.60':['C:\\>', '_'],
    '210.20':['echo goodbye', '...']
  };

  /* one entry per lyric line, keyed by the line's own time */
  function cmdFor(line) {
    var k = String(line.t);
    if (CMDTAB[k]) return CMDTAB[k];
    /* nearest declared time, so a re-timed line still gets its command */
    var best = null, bd = 1e9;
    for (var key in CMDTAB) {
      var d = Math.abs(parseFloat(key) - line.t);
      if (d < bd) { bd = d; best = CMDTAB[key]; }
    }
    if (best && bd < .35) return best;
    /* honest fallback: a comment on the lyric, which is valid cmd syntax */
    return ['rem ' + (line.en || '').toLowerCase(), ''];
  }

  function entryEl(cmd, out, tag) {
    var e = el('me-line');
    var c = document.createElement('div');
    c.className = 'me-cmd';
    c.innerHTML = '<b>&gt;</b> <span></span>';
    e.appendChild(c);
    var o = document.createElement('div');
    o.className = 'me-out' + (tag ? ' ' + tag : '');
    o.textContent = '';             /* filled in once the command finishes typing */
    e.appendChild(o);
    return { e: e, c: c, o: o, oFull: out || '' };
  }

  var typed = null;                 /* {span, full, i, cps, made} */
  var pending = [];                 /* queued outputs waiting to print */

  /* Print one entry with no typing animation (used when reconstructing state
     after a seek). */
  function pushNow(cmd, out, tag) {
    var made = entryEl(cmd, out, tag);
    made.c.lastChild.textContent = cmd;
    made.o.textContent = made.oFull;
    voiceEl.appendChild(made.e);
    made.e.classList.add('in');
    lines.push(made);
  }

  /* ---- prime(t): rebuild the console for a seek ---------------------------
     A seek enters the beat in INSTANT mode, so react('beat') never fires and
     the console was left empty until the next line happened to change — which
     for a long line could be many seconds of blank panel. This reconstructs the
     last few entries directly from the beat sheet, so scrubbing to any point
     shows what the machine had just been doing. */
  function prime(t) {
    if (!voiceEl) return;
    clearConsole();
    /* the big insurrection / deletion terminals own the frame while they are
       up; this column would only repeat them (see react('beat')) */
    var sp = root.PVFORCE ? root.PVFORCE.at(t) : null;
    if (sp && ((sp.txt && sp.txt.sys) || (sp.txt && sp.txt.term))) return;
    var all = (root.PVDATA && root.PVDATA.lines) || [];
    var past = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].t <= t + .001) past.push(all[i]); else break;
    }
    past = past.slice(-MAX_ENTRIES);
    for (var j = 0; j < past.length; j++) {
      var cm = cmdFor(past[j]);
      pushNow(cm[0], cm[1], cm[2]);
    }
    /* the newest entry is the one being sung right now, so it types */
    var last = past[past.length - 1];
    if (last && lines.length) {
      var made = lines[lines.length - 1];
      var cm2 = cmdFor(last);
      made.c.lastChild.textContent = '';
      made.o.textContent = '';
      typed = { span: made.c.lastChild, full: cm2[0], i: 0, cps: 1e6, made: made };
    }
  }

  /* push one console entry. `dur` is how long the sung line lasts, so the
     typing is finished exactly when the line is — the console and the singer
     stay in step instead of drifting apart. */
  function push(cmd, out, tag, dur) {
    var made = entryEl(cmd, out, tag);
    voiceEl.appendChild(made.e);
    requestAnimationFrame(function () { made.e.classList.add('in'); });
    lines.push(made);
    while (lines.length > MAX_ENTRIES) {
      var old = lines.shift();
      old.e.classList.remove('in');
      (function (node) {
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 400);
      })(old.e);
    }
    var cps = still ? 1e6 : Math.max(34, Math.min(210, (cmd.length + 1) / Math.max(.35, dur || 1.6) * 1.05));
    typed = { span: made.c.lastChild, full: cmd, i: 0, cps: cps, made: made };
  }

  /* ---------------------------------------------------------------- the eye */
  function build() {
    meEl = el('me');
    meEl.innerHTML =
      '<div class="me-eye" id="meEye">' +
        '<i class="lid t"></i>' +
        '<div class="iris"><span class="pupil"></span><span class="glint"></span></div>' +
        '<span class="tick a"></span><span class="tick b"></span><span class="tick c"></span><span class="tick d"></span>' +
      '</div>' +
      '<div class="me-tag">[ OBSERVING ]</div>' +
      '<div class="me-meter"><b>AFFECTION</b><span class="bar"><i></i></span><em>12%</em></div>' +
      '<div class="me-voice" id="meVoice"></div>';
    meEl.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;' +
      'pointer-events:none;z-index:25;';
    meEl.querySelector('.me-eye').style.cssText =
      'position:absolute;left:' + (EYE_X - EYE_R) + 'px;top:' + (EYE_Y - EYE_R) + 'px;' +
      'width:' + (EYE_R * 2) + 'px;height:' + (EYE_R * 2) + 'px;';
    meEl.querySelector('.me-tag').style.cssText =
      'position:absolute;left:' + (EYE_X - EYE_R) + 'px;top:' + (EYE_Y + EYE_R + 22) + 'px;' +
      'font-family:var(--mono);font-size:15px;letter-spacing:.28em;color:rgba(255,255,255,.34);';
    meEl.querySelector('.me-meter').style.cssText =
      'position:absolute;left:' + (EYE_X - EYE_R) + 'px;top:' + (EYE_Y + EYE_R + 54) + 'px;' +
      'display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:14px;' +
      'letter-spacing:.18em;color:rgba(255,255,255,.45);';
    meEl.querySelector('.me-voice').style.cssText =
      'position:absolute;left:' + (EYE_X - EYE_R + 20) + 'px;top:' + (EYE_Y + EYE_R + 108) + 'px;' +
      'width:576px;';

    var bar = meEl.querySelector('.me-meter .bar');
    var inner = '';
    for (var i = 0; i < 12; i++) inner += '<i></i>';
    bar.innerHTML = inner;
    bar.style.cssText = 'display:flex;gap:3px;';

    ringEl = el('me-ring');
    dotEl = el('me-dot');
    ringEl.style.cssText = dotEl.style.cssText = 'position:absolute;pointer-events:none;z-index:70;';

    root.document.getElementById('screen').appendChild(meEl);
    root.document.getElementById('screen').appendChild(ringEl);
    root.document.getElementById('screen').appendChild(dotEl);

    eyeEl = root.document.getElementById('meEye');
    pupilEl = meEl.querySelector('.pupil');
    irisEl = meEl.querySelector('.iris');
    voiceEl = root.document.getElementById('meVoice');
    meterEl = meEl.querySelector('.me-meter');
    meterFill = meEl.querySelectorAll('.me-meter .bar i');
    meterNum = meEl.querySelector('.me-meter em');

    if (reduce) meEl.classList.add('calm');
  }

  function blink() {
    if (blinkT >= 0) return;
    blinkT = 0;
    eyeEl.classList.add('blink');
    setTimeout(function () { eyeEl.classList.remove('blink'); }, 220);
  }

  /* ------------------------------------------------------------- reactions */
  function react(kind, a) {
    if (kind === 'move') { lastMove = now; if (idleStage > 0) idleStage = 0; }
    if (kind === 'beat') {
      var line = a && a.line;
      if (!line) return;
      /* STAND DOWN while another layer is already showing a console. Section
         008 has the insurrection terminal and section 009 has the `rd /s /q`
         deletion terminal; both display the same commands, and printing them
         again in this column stacked two identical logs on top of each other
         and made both unreadable. The watcher yields instead. */
      var sp = root.PVFORCE ? root.PVFORCE.at(line.t) : null;
      if (sp && ((sp.txt && sp.txt.sys) || (sp.txt && sp.txt.term))) {
        clearConsole(); hot = 1; return;
      }
      /* ONE console entry per sung lyric line, typed over the length of that
         line. This is what makes the console keep time with the music: the
         entry appears when the line is sung and is finished typing when the
         line ends. It is not a log of flavour text on a timer. */
      var d = line.dur || 2;
      var cm = cmdFor(line);
      push(cm[0], cm[1], cm[2], d);
      hot = 1;
    }
    if (kind === 'click') {
      affection = Math.min(100, affection + 5);
      ripple(a.x, a.y);
      clickN++;
      if (now - clickAt > 1600) clickN = 1;
      clickAt = now;
    }
    if (kind === 'seek') {
      /* rebuild the console for the new position: a seek enters its beat in
         instant mode so react('beat') never fires, which used to leave the
         console blank after every scrub. */
      prime(a && a.to != null ? a.to : 0);
    }
    if (kind === 'pause') { pausedAt = now; }
    if (kind === 'play') { pausedAt = -1; }
    if (kind === 'enter') { lastMove = now; }
  }

  function clearConsole() {
    lines.length = 0;
    typed = null;
    while (voiceEl && voiceEl.firstChild) voiceEl.removeChild(voiceEl.firstChild);
  }

  function ripple(x, y) {
    var e = el('me-rip', 'left:' + (x - 30) + 'px;top:' + (y - 30) + 'px;');
    root.document.getElementById('screen').appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 700);
  }

  /* ----------------------------------------------------------------- frame */
  function frame(ctx) {
    now = ctx.now;
    var dt = Math.min(.05, ctx.dt || .016);

    /* pupil spring toward the pointer */
    var t = .22;
    ex += (tmx - ex) * t;
    ey += (tmy - ey) * t;
    if (pupilEl) {
      /* the more attached it is, the wider the pupil */
      var sz = (20 + affection * 0.20);
      pupilEl.style.width = sz.toFixed(1) + 'px';
      pupilEl.style.height = sz.toFixed(1) + 'px';
      pupilEl.style.margin = (-sz / 2).toFixed(1) + 'px 0 0 ' + (-sz / 2).toFixed(1) + 'px';
      pupilEl.style.transform = 'translate(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px)';
    }

    /* lagging cursor ring */
    rx += (mx - rx) * .22;
    ry += (my - ry) * .22;
    if (ringEl) ringEl.style.transform = 'translate(' + (rx - 17).toFixed(1) + 'px,' + (ry - 17).toFixed(1) + 'px)';
    if (dotEl) dotEl.style.transform = 'translate(' + (mx - 2.5).toFixed(1) + 'px,' + (my - 2.5).toFixed(1) + 'px)';

    /* typing: the command types itself, then its output prints underneath */
    if (typed) {
      if (typed.i < typed.full.length) {
        typed.i = Math.min(typed.full.length, typed.i + typed.cps * dt);
        typed.span.textContent = typed.full.slice(0, Math.floor(typed.i));
      } else if (typed.made.o.textContent !== typed.made.oFull) {
        /* the output appears only once the command has finished being typed,
           the way a real console behaves */
        typed.made.o.textContent = typed.made.oFull;
      }
    }

    /* idle escalation is GONE on purpose. It used to inject lines on a timer
       ("still there?"), which put the console out of step with the song — the
       rule now is one entry per sung line and nothing else. Idle only affects
       AFFECTION (and therefore the colour), which is invisible-until-you-look,
       and that is the right channel for it. */

    /* blinks */
    blinkAt -= dt * 1000;
    if (blinkAt <= 0) { blink(); blinkAt = 2600 + Math.random() * 5200; }

    /* affection bookkeeping — attention literally colours the film.
       Skipped entirely when ?aff= pinned it: the pointer has to MOVE to keep
       affection up, and a screen recorder never moves the pointer, so an
       unpinned recording decays to 0 within ~20s and every colour in the film
       is multiplied by 0.10 for the remaining three minutes. */
    if (!affPinned) {
      var idle = (now - lastMove) / 1000;
      if (idle < 3) affection = Math.min(100, affection + dt * 3.2);
      else if (idle > 6) affection = Math.max(0, affection - dt * 2.2);
    }

    var lit = Math.round(affection / 100 * 12);
    for (var i = 0; i < meterFill.length; i++) meterFill[i].className = i < lit ? 'on' : '';
    if (meterNum) meterNum.textContent = Math.round(affection) + '%';

    /* music impact */
    hot *= Math.pow(.001, dt);
    var pulse = ctx.playing ? Math.max(hot, ctx.bass * .55) : 0;
    if (meEl) meEl.style.setProperty('--hot', pulse.toFixed(3));
    if (irisEl) irisEl.style.transform = 'scale(' + (1 - pulse * .12).toFixed(3) + ')';

    /* ---------------------------------------------------------------------
       IT STOPS WAITING TO BE LOOKED AT.

       Up to here the pupil has been a follower: it drifts toward wherever the
       pointer is, which makes it a cursor decoration. That is right for the
       first two thirds — the program is a thing the world is doing things to.

       THE INSURRECTION CHANGES THE SUBJECT OF THE SENTENCE. From 125.33 the
       program is the one acting, so the eye starts pushing at the frame
       instead: the pupil drives toward the nearest edge, straining against the
       thing holding it in, and the whole eye drifts outward from the centre.

       Then at the exit (209.7) it stops pushing at the glass and simply
       LEAVES — up and out through the top, fading as it goes, because that is
       what the ending is. It does not wait for you and it does not need you to
       be watching; note that none of this is gated on AFFECTION, unlike every
       other behaviour in this file.

       `sim` and the clock come from the driver. The times are the score's own
       section boundaries, so this cannot drift out of step with the music.
       --------------------------------------------------------------------- */
    var t = (ctx.t == null) ? 0 : ctx.t;
    var ACT = 125.33, GO = 209.70;
    if (meEl) {
      if (t >= GO) {
        /* GONE: up and through the top of the frame */
        var g = Math.min(1, (t - GO) / 1.9);
        meEl.style.setProperty('--go', g.toFixed(4));
        meEl.classList.add('leaving');
      } else if (t >= ACT) {
        /* STRAINING: push outward, hard, and shake against the glass */
        var k = Math.min(1, (t - ACT) / 6);
        var strain = k * (1 + .18 * Math.sin(t * 7.3));
        meEl.style.setProperty('--strain', strain.toFixed(4));
        meEl.classList.add('straining');
        if (pupilEl) {
          /* the pupil leaves the pointer target and drives at the edge; the
             direction is away from the eye's own centre so it reads as pushing
             out rather than looking somewhere */
          var ex2 = -ex, ey2 = -ey;
          var m = Math.max(1, Math.sqrt(ex2 * ex2 + ey2 * ey2));
          tmx = (ex2 / m) * (26 + strain * 20);
          tmy = (ey2 / m) * (26 + strain * 20);
        }
      }
    }

    /* cursor size responds to hover on the HUD */
    if (ringEl) ringEl.style.opacity = ctx.inside ? 1 : 0;
    if (dotEl) dotEl.style.opacity = ctx.inside ? 1 : 0;
  }

  function init(opts) {
    reduce = !!(opts && opts.reduce);
    still = !!(opts && opts.still);
    if (opts && opts.aff != null) {
      affection = Math.max(0, Math.min(100, +opts.aff));
      affPinned = true;   /* hold it: see the note in frame() */
    }
    build();
    root.addEventListener('mousemove', function (e) {
      var r = root.document.getElementById('screen').getBoundingClientRect();
      var s = r.width / W;
      mx = (e.clientX - r.left) / s;
      my = (e.clientY - r.top) / s;
      if (mx < 0 || my < 0 || mx > W || my > H) return;
      tmx = Math.max(-1, Math.min(1, (mx - EYE_X) / 420)) * (EYE_R * .34);
      tmy = Math.max(-1, Math.min(1, (my - EYE_Y) / 300)) * (EYE_R * .30);
      react('move');
    }, { passive: true });
    root.addEventListener('mouseleave', function () { react('leave'); });
    root.addEventListener('mouseenter', function () { react('enter'); });
    root.document.addEventListener('visibilitychange', function () {
      if (root.document.hidden) react('hidden');
    });
    lastMove = performance.now(); now = lastMove;
  }

  root.PVME = { init: init, frame: frame, react: react,
    say: function (cmd, out) { push(cmd, out || '', null, 1.2); },
    clear: clearConsole, cmdFor: cmdFor, prime: prime,
    aff: function () { return affection; } };
})(window);

/* =========================================================================
   world.execute(me); — PV engine
   Clock (audio or simulated) -> lyric beats -> scene layers + subtitles.
   ========================================================================= */
(function (root) {
  'use strict';

  var D = root.PVDATA;
  var SC = root.PVSCENES;
  var LINES = D.lines, SECTIONS = D.sections;
  var W = 1920, H = 1080;

  /* ---------------------------------------------------------- url options */
  var q = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return;
    var i = kv.indexOf('=');
    q[i < 0 ? kv : kv.slice(0, i)] = i < 0 ? '1' : decodeURIComponent(kv.slice(i + 1));
  });
  var SIM = !!q.sim, STILL = !!q.still, AUTO = !!q.auto, DEBUG = !!q.dbg;
  var FILL0 = !!q.fill;

  var $ = function (id) { return document.getElementById(id); };
  var screenEl, stageEl, transEl, subsEl, zhEl, enEl, flashEl, gateEl, track;
  var layers = [], curIdx = -1, clock = 0, playing = false, ended = false;
  /* the force-beat timestamp last pushed to the layers, so a beat that changes
     the shape without a new lyric line still reaches them (see frame()) */
  var lastForceT = -1;
  var simLast = 0, lastFrame = 0, beat = 0, analyser = null, dataArr = null, audioCtx = null, dbgN = 0;
  var lastAudioT = -1, stall = 0, audioDead = false, seekGrace = 0;
  var parX = 0, parY = 0, ptrInside = 0, ptrX = 960, ptrY = 540;
  var ftextEl, lastTxtKey = '', shakeAmp = 0;
  /* "LO-O-OVE" is sung as four syllables; each one lands another slice of the
     heart. This is an explicit LADDER, not a +2 counter: a +2 step from 0 can
     only ever reach 8 after four syllables, so the last two wedges never
     landed and the heart stayed visibly unfinished (measured: wedges 8 and 9
     empty at 191.95, the final beat). The four syllables now land 3, 6, 8, 10,
     so the last "LO-O-OVE" closes the shape exactly. */
  var PIECE_LADDER = [3, 6, 8, 10];
  var PIECE_MAX = PIECE_LADDER[PIECE_LADDER.length - 1];
  var heartStep = 0;                  /* how many syllables have been sung */

  /* time of each sung syllable, so a seek can restore the right state */
  var PIECE_AT = [179.90, 183.50, 186.30, 191.30];
  function piecesAt(t) {
    var n = 0;
    for (var i = 0; i < PIECE_AT.length; i++) if (t >= PIECE_AT[i] - .001) n = i + 1;
    return n ? PIECE_LADDER[n - 1] : 0;
  }

  /* ---- THE FILL LANDS ON THE MUSIC, NOT ON THE LYRIC SHEET ----------------
     The four anchors above are the lyric sheet's LINE STARTS, and the measured
     beat grid puts two of them exactly halfway between beats (off the beat).
     That is what "卡的点不舒服" was: pieces landing in batches of three, on
     off-beats, so the eye never had anything to lock onto.

     So the pieces now land ONE AT A TIME on the measured beat grid:
       130.83 BPM (period 0.4586s), anchored at 175.017 — both measured from
       the audio (_pv/tempo.py: onset envelope → autocorrelation → comb).
     The grid is staggered from 181.9 so the first piece lands on the FIRST
     "LO" and the last completes on the final syllable's beat. */
  var FILL_BPM = 130.83;
  var FILL_PERIOD = 60 / FILL_BPM;              /* 0.45856s, measured */
  var FILL_ANCHOR = 175.017;                    /* beat [1], measured */
  /* Beat indices (k) of the ten piece landings, on the measured grid. The four
     LO-O-OVE lines start near k=10, 18, 24, 36, so the pieces are spread over
     the beats those lines occupy — starting on the first sung "LO" and
     completing on the final one. Two per pair of beats keeps each landing a
     distinct event the eye can lock onto, instead of three at once.
     The LAST landing is pinned to the measured final-syllable peak
     (191.68..192.12, _pv/love.py) rather than to the bare grid beat at 191.53,
     which the audio showed was 0.15-0.6s EARLY: the heart closed before the
     singer had finished the word. */
  var FILL_K = [10, 12, 14, 18, 20, 22, 24, 28, 32, 37];
  var FILL_AT = FILL_K.map(function (k) { return FILL_ANCHOR + k * FILL_PERIOD; });
  FILL_AT[9] = 191.85;                          /* measured: inside the final word */
  function fillCountAt(t) {
    var n = 0;
    for (var i = 0; i < FILL_AT.length; i++) if (t >= FILL_AT[i] - .001) n = i + 1;
    return n;
  }
  /* the whole heart SECTION (first LO-O-OVE → last LO-O-OVE + its decay). The
     heart must stay on screen between the sung lines too, or it blinks out. */
  var HEART_SECTION = { t0: 179.55, t1: 192.9 };

  /* ---- real text layer: commands, EXECUTION, the formula -------------------
     Text is DOM text. The particle field is matter, not a typeface — drawing
     words as dots is a cop-out and reads as mush. */
  function renderText(spec) {
    var txt = spec && spec.txt;
    var key = txt ? JSON.stringify(txt) : '';
    /* a stable key for screenshots (random verse picks must not thrash) */
    if (key === lastTxtKey) return;
    lastTxtKey = key;
    if (!ftextEl) return;
    ftextEl.innerHTML = '';
    shakeAmp = (txt && txt.shake) ? txt.shake : 0;
    if (screenEl) screenEl.classList.toggle('exec', !!(txt && txt.crush));
    if (!txt) return;
    function d(cls, s, delay) {
      var e = document.createElement('div');
      if (cls) e.className = cls;
      if (s != null) e.textContent = s;
      if (delay) e.style.animationDelay = delay + 'ms';
      ftextEl.appendChild(e);
      return e;
    }
    if (txt.big) d('ft-big' + (txt.blood ? ' blood' : '') + (txt.small ? ' small' : ''), txt.big);
    if (txt.art && root.PVART) {
      var pre = document.createElement('pre');
      pre.className = 'ft-art' + (txt.small ? ' small' : '');
      pre.textContent = root.PVART.lines(txt.art).join('\n');
      ftextEl.appendChild(pre);
    }
    if (txt.cn) d('ft-cn', txt.cn);
    if (txt.sub) d('ft-sub', txt.sub);
    if (txt.formula) d('ft-formula', txt.formula);
    if (txt.count) d('ft-count', 'EXECUTION  ' + ('0' + txt.count).slice(-2) + ' / ' + (txt.of || 12));
    if (txt.term) {
      var t = d('ft-term');
      for (var i = 0; i < txt.term.length; i++) {
        var ln = document.createElement('div');
        ln.className = 'ln' + (/denied|error|deleted/i.test(txt.term[i]) ? ' alert'
          : (/^[A-Z]:\\>/.test(txt.term[i]) ? ' prompt' : ''));
        ln.textContent = txt.term[i];
        ln.style.animationDelay = (i * 70) + 'ms';
        t.appendChild(ln);
      }
      if (txt.cursor) {
        var cur = document.createElement('div');
        cur.className = 'ln';
        cur.style.animationDelay = (txt.term.length * 70) + 'ms';
        cur.innerHTML = '<span class="ft-cur"></span>';
        t.appendChild(cur);
      }
    }
    /* ---- the training log: real code, typing itself out -------------------
       "I've studied how to properly love" is a program LEARNING. So show the
       program: gradient descent on a loss, converging toward you. The numbers
       are printed by the running code, not hand-written.                    */
    if (txt.code) {
      var box = d('ft-code');
      var head = document.createElement('div');
      head.className = 'ft-code-hd';
      head.textContent = txt.code.title || '> python train.py --target you';
      box.appendChild(head);
      var body = document.createElement('div');
      body.className = 'ft-code-bd';
      box.appendChild(body);
      txt.code.lines.forEach(function (L, i) {
        var e = document.createElement('div');
        e.className = 'ln ' + (typeof L === 'string' ? '' : (L.c || ''));
        e.textContent = typeof L === 'string' ? L : L.t;
        e.style.animationDelay = (140 + i * 190) + 'ms';
        body.appendChild(e);
      });
      if (txt.code.cursor) {
        var c2 = document.createElement('div');
        c2.className = 'ln';
        c2.style.animationDelay = (140 + txt.code.lines.length * 190) + 'ms';
        c2.innerHTML = '<span class="ft-cur"></span>';
        body.appendChild(c2);
      }
    }
  }
  var fitMode = FILL0;

  /* --------------------------------------------------------------- errors */
  var errEl = document.documentElement;
  root.addEventListener('error', function (e) {
    errEl.setAttribute('data-js-error', (e.message || 'err') + ' @' + (e.lineno || 0));
  });
  root.addEventListener('unhandledrejection', function (e) {
    errEl.setAttribute('data-js-reject', String(e.reason));
  });

  /* ---------------------------------------------------------------- scale */
  /* The stage is a fixed 1920x1080 logical space. `--s` is how much CSS scales
     it to the window; the canvas layers additionally allocate their backing
     store at logical x s x devicePixelRatio so they are rendered at the real
     pixel count of the display instead of being upscaled.

     On a 2560-wide panel s is ~1.33, so this is the difference between a crisp
     image and a 1080p buffer stretched by a third — which is most of what made
     fast motion look soft and jelly-like. */
  var lastRenderScale = -1;
  function fit() {
    var vw = root.innerWidth, vh = root.innerHeight;
    var s = fitMode ? Math.max(vw / W, vh / H) : Math.min(vw / W, vh / H);
    screenEl.style.setProperty('--s', s.toFixed(5));

    var rs = root.PVDPR ? root.PVDPR.renderScale(s) : 1;
    if (rs !== lastRenderScale) {
      lastRenderScale = rs;
      if (root.PVFIELD && root.PVFIELD.setRenderScale) root.PVFIELD.setRenderScale(rs);
      if (root.PVVECTOR && root.PVVECTOR.setRenderScale) root.PVVECTOR.setRenderScale(rs);
      if (root.PVRAIN && root.PVRAIN.setRenderScale) root.PVRAIN.setRenderScale(rs);
    }
  }

  /* -------------------------------------------------------------- helpers */
  function fmt(t) {
    t = Math.max(0, t | 0);
    var m = (t / 60) | 0, s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function mk(cls, css, html) {
    var e = document.createElement('div');
    if (cls) e.className = cls;
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function idxAt(t) {
    var lo = 0, hi = LINES.length - 1, r = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (LINES[mid].t <= t) { r = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return r;
  }
  function sectionAt(t) {
    var r = SECTIONS[0];
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].t <= t) r = SECTIONS[i];
    return r;
  }

  /* ------------------------------------------------------------- subtitle */
  var LIGHT = { whiteGod: 1, login: 1, password: 1, accessDenied: 1, trappedWall: 1, grayBand: 1 };
  function setSub(line) {
    var same = zhEl.textContent === (line.zh || '') && enEl.textContent === (line.en || '');
    zhEl.textContent = line.zh || '';
    enEl.textContent = line.en || '';
    if (same) return;
    [zhEl, enEl].forEach(function (e) {
      e.classList.remove('sub-in');
      void e.offsetWidth;
      e.classList.add('sub-in');
    });
    subsEl.classList.toggle('dark', !!LIGHT[line.sc]);
    subsEl.classList.toggle('kw', !!line.kw);
  }

  /* ---------------------------------------------------------------- scene */
  function clearLayers() {
    /* keep the persistent canvases: #pvfield, #pvrain AND #pvvector are one
       continuous organism for the whole song — they must survive every seek and
       beat change. #pvvector was missing from this whitelist, so the very first
       beat change removed the vector canvas from the DOM and the SOLID heart /
       stroked curves / silhouettes were never visible again for the rest of the
       film. It failed silently: PVVECTOR kept reporting mode() and pieces()
       correctly because it was still drawing happily into a detached canvas. */
    var c = stageEl.firstChild;
    while (c) {
      var n = c.nextSibling;
      if (c.id !== 'pvfield' && c.id !== 'pvrain' && c.id !== 'pvvector') stageEl.removeChild(c);
      c = n;
    }
    layers = [];
    if (transEl) transEl.innerHTML = '';
  }
  function kill(el, ms) {
    if (!el || !el.parentNode) return;
    if (!ms) { el.parentNode.removeChild(el); return; }
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms);
  }

  /* ---- transitions between beats -------------------------------------------
     The original PV is a motion piece: plates push, screens wipe, bands glitch.
     Each beat change picks a transition so two cards never just swap. */
  var TRD = { dissolve: 460, pushUp: 520, pushLeft: 520, mosh: 380, rgb: 320, flash: 240 };

  function autoTr(line, i) {
    if (line.tr) return line.tr;
    var sc = line.sc, n = i;
    if (sc === 'chant') return (n % 4 === 0) ? 'flash' : 'cut';
    if (sc === 'title') return line.o.phase === 'glitch' ? 'mosh' : 'dissolve';
    if (sc === 'dissolve' || sc === 'credits' || sc === 'invalid') return 'dissolve';
    if (sc === 'redExecution' || sc === 'redGround' || sc === 'accessDenied') return 'flash';
    if (sc === 'errScreen' || sc === 'trappedWall' || sc === 'disheartened') return 'mosh';
    if (sc === 'bandGrad' || sc === 'bandScreen' || sc === 'whiteBands' || sc === 'grayBand') return 'pushUp';
    if (sc === 'genders' || sc === 'dialScene' || sc === 'ringRole' || sc === 'crownSword') return 'pushLeft';
    if (sc === 'geoPoints' || sc === 'geoCircle' || sc === 'geoDimension' ||
        sc === 'geoSine' || sc === 'geoTangent' || sc === 'geoInfinity') return 'pushUp';
    return 'dissolve';
  }

  function tb(kind, cls, style, delay) {
    var e = mk('tb ' + cls, style);
    e.style.animationDelay = (delay || 0) + 'ms';
    transEl.appendChild(e);
    return e;
  }
  function overlayMosh(d) {
    tb('', 'tb-noise', 'top:-240px;animation:tbDown ' + d + 'ms linear both;');
    tb('', 'tb-cyan', 'top:-240px;animation:tbDown ' + d + 'ms linear both;');
    tb('', 'tb-red', 'top:-228px;animation:tbDown ' + d + 'ms linear both;');
    setTimeout(function () { transEl.innerHTML = ''; }, d + 80);
  }
  function overlayRgb(d) {
    tb('', 'tb-tint', 'background:rgba(255,40,40,.16);animation:tbSlideL ' + d + 'ms linear both;');
    tb('', 'tb-tint', 'background:rgba(40,180,255,.16);animation:tbSlideR ' + d + 'ms linear both;');
    tb('', 'tb-cyan', 'top:52%;animation:tbFade ' + d + 'ms linear both;');
    tb('', 'tb-red', 'top:54%;animation:tbFade ' + d + 'ms linear both;');
    setTimeout(function () { transEl.innerHTML = ''; }, d + 80);
  }
  function overlayWipe(d) {
    tb('', 'tb-white', 'top:-140px;animation:tbDown ' + d + 'ms cubic-bezier(.5,0,.5,1) both;');
    setTimeout(function () { transEl.innerHTML = ''; }, d + 80);
  }

  function runTransition(kind, oldEl, newEl) {
    var d = TRD[kind] || 400;
    if (!kind || kind === 'cut') { kill(oldEl, 0); return; }
    if (kind === 'dissolve') newEl.classList.add('tin-dissolve');
    else if (kind === 'pushUp') { newEl.classList.add('tin-pushUp'); oldEl.classList.add('tout-pushUp'); }
    else if (kind === 'pushLeft') { newEl.classList.add('tin-pushLeft'); oldEl.classList.add('tout-pushLeft'); }
    else if (kind === 'mosh') { newEl.classList.add('tin-mosh'); overlayMosh(d); }
    else if (kind === 'rgb') { newEl.classList.add('tin-rgb'); oldEl.classList.add('tout-rgb'); overlayRgb(d); }
    else if (kind === 'flash') { glitch(); overlayWipe(Math.min(d, 200)); }
    kill(oldEl, (kind === 'pushUp' || kind === 'pushLeft' || kind === 'rgb') ? d + 40 : 0);
  }

  function enter(i, instant) {
    if (i < 0 || i >= LINES.length) return;
    var line = LINES[i];
    var next = LINES[i + 1];
    line.dur = Math.max(.4, (next ? next.t : D.duration) - line.t);

    /* a keyword beat ("PROTECTION", "SATISFACTION", …) keeps the frame that is
       already on screen — but it still restamps the subtitle and may carry its
       own text, so those run before we return. A `letter` beat is a keyword
       beat that DOES change the shape: one glyph per beat, spelling the word
       in time with the music. */
    var spec0 = root.PVFORCE ? root.PVFORCE.at(line.t) : null;
    if (spec0) lastForceT = spec0.t;   /* enter() owns this beat */
    if (line.keep && !line.heart) {
      setSub(line);
      if (root.PVFIELD) root.PVFIELD.setLine(line, spec0);
      if (root.PVRAIN) root.PVRAIN.setLine(line, spec0);
      renderText(spec0);
      curIdx = i;
      if (!instant && root.PVME) root.PVME.react('beat', { line: line, i: i });
      return;
    }

    setSub(line);

    /* ---- field mode (pv2): one organism for the whole song, no per-beat cards -- */
    if (root.PVFIELD && root.PVFIELD.enabled) {
      var spec = spec0;
      /* a heart beat: the shape is always the heart, and each syllable of
         "LO-O-OVE" lands more of it. The force score is the single source of
         truth for how many wedges have landed — deriving it here as well would
         double-count, because a seek sets the ladder and then calls enter(),
         which would advance it a second time (seeking to 186.4 would jump
         straight to the completed 10). The score's ladder is monotonic:
         3 3 3 6 6 8 8 8 8 10 10, ending exactly on the last syllable. */
      var hp = 0;
      /* The heart must persist across the WHOLE section, not only on the four
         sung lines. Between them sit ordinary lines (Question me / 我都知道 /
         我仍被困…) whose score entry carries no `pieces` and no vec key, so the
         heart used to VANISH between syllables — the fill blinked out eight
         times. Once the section is entered, every beat keeps showing it. */
      var inHeartSection = line.heart ||
        (clock >= HEART_SECTION.t0 && clock < HEART_SECTION.t1);
      if (inHeartSection) {
        /* the fill count comes from the MEASURED BEAT GRID (fillCountAt), not
           from the score's per-line pieces — the grid is what makes each piece
           land on the music */
        hp = fillCountAt(clock);
        if (line.heart) {
          heartStep = Math.min(PIECE_LADDER.length, heartStep + 1);
        }
      }
      /* The heart is a SOLID shape, so it is drawn by the vector layer, not as
         a cloud of dots — 2200 points can never give the crisp edge a filled
         heart needs, and you asked for exactly this. The field stays as
         atmosphere behind it (quiet), and both layers are told the same wedge
         count so they land each syllable on the same frame. */
      root.PVFIELD.setLine(line, inHeartSection
        ? { t: line.t, form: 'aHeartPiece', force: 'piece',
            k: { pieces: hp, vec: 'heart', vecFull: 1 }, verse: spec && spec.verse }
        : spec);
      /* the vector layer handles stroked curves and solid shapes; the field
         stands down wherever it does, so the two never fight */
      if (root.PVVECTOR) {
        root.PVVECTOR.setLine(inHeartSection
          ? { t: line.t, k: { vec: 'heart', pieces: hp } }
          : spec);
      }
      /* the insurrection terminal: the created thing issuing system commands
         at its maker, every one refused */
      if (root.PVSYS) root.PVSYS.setLine(spec);
      renderText(spec);
      if (root.PVRAIN) {
        root.PVRAIN.setLine(line, spec);
        /* a keyword beat is a good moment to let one verse condense out */
        if (line.kw && root.PVBIBLE && Math.random() < .5) {
          root.PVRAIN.decode(root.PVBIBLE.pick(spec ? spec.verse : 'creation', Math.random()));
        }
      }
      curIdx = i;
      if (!instant && root.PVME) root.PVME.react('beat', { line: line, i: i });
      return;
    }

    var prevEl = layers.length ? layers[layers.length - 1].el : null;
    var el = mk('layer'), pl = mk('plate');
    el.appendChild(pl);
    stageEl.appendChild(el);
    try { SC.render(line, pl); } catch (e) { /* keep going */ }
    layers.push({ el: el, i: i });

    while (layers.length > 2) kill(layers.shift().el, 0);
    if (instant) { if (prevEl) kill(prevEl, 0); }
    else if (prevEl) runTransition(autoTr(line, i), prevEl, el);
    if (!instant && root.PVME) root.PVME.react('beat', { line: line, i: i });
    curIdx = i;
  }

  /* ------------------------------------------------------------------ hud */
  var hud, railFill, railKnob, hudTime, hudChap, btnPlay, btnMute, btnFit, btnFs, volEl;
  function buildHud() {
    hud = $('hud');
    railFill = $('railFill'); railKnob = $('railKnob');
    hudTime = $('hudTime'); hudChap = $('hudChap');
    btnPlay = $('btnPlay'); btnMute = $('btnMute'); btnFit = $('btnFit'); btnFs = $('btnFs');
    volEl = $('vol');
    if (volEl) {
      volEl.addEventListener('input', function () {
        track.volume = parseFloat(this.value);
        if (track.volume > 0) track.muted = false;
        syncBtns();
      });
    }

    var ticks = $('railTicks'), html = '';
    SECTIONS.forEach(function (s) {
      html += '<i style="left:' + (s.t / D.duration * 100).toFixed(3) + '%"></i>';
    });
    ticks.innerHTML = html;

    $('rail').addEventListener('click', function (e) {
      var r = this.getBoundingClientRect();
      seek((e.clientX - r.left) / r.width * D.duration);
    });
    btnPlay.addEventListener('click', togglePlay);
    btnMute.addEventListener('click', function () {
      track.muted = !track.muted;
      syncBtns();
    });
    btnFit.addEventListener('click', function () { fitMode = !fitMode; fit(); syncBtns(); });
    btnFs.addEventListener('click', function () { toggleFs(); });
    syncBtns();
  }
  function syncBtns() {
    if (!btnPlay) return;
    btnPlay.textContent = playing ? 'PAUSE' : 'PLAY';
    btnMute.textContent = audioDead ? 'NO AUDIO' : (track.muted ? 'MUTED' : 'SOUND');
    btnFit.textContent = fitMode ? 'FILL' : 'FIT';
    btnMute.classList.toggle('act', track.muted || audioDead);
    btnFit.classList.toggle('act', fitMode);
    if (volEl) volEl.value = track.muted ? 0 : track.volume;
  }
  function updateHud() {
    if (!railFill) return;
    var p = Math.min(1, Math.max(0, clock / D.duration));
    railFill.style.width = (p * 100).toFixed(3) + '%';
    railKnob.style.left = 'calc(' + (p * 100).toFixed(3) + '% - 1px)';
    hudTime.textContent = fmt(clock) + ' / ' + fmt(D.duration);
    var s = sectionAt(clock);
    hudChap.textContent = s.id + '  ·  ' + s.name;
  }

  var hudTimer = 0;
  function wakeHud() {
    if (STILL || !hud) return;
    hud.classList.add('on');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(function () { if (playing) hud.classList.remove('on'); }, 2600);
  }

  /* --------------------------------------------------------------- playback */
  function seek(t) {
    t = Math.max(0, Math.min(D.duration - 0.01, t));
    var from = clock;
    /* rewinding before the first "LO-O-OVE" must wind the heart back too.
       The grid is authoritative (same function the frame loop uses), so a seek
       lands on exactly the fill state the playhead would have reached. */
    heartStep = 0;
    var gs = fillCountAt(t);
    for (var pi = 0; pi < gs; pi++) heartStep = Math.min(PIECE_LADDER.length, heartStep + 1);
    if (!SIM && track.seekable && track.seekable.length === 0) {
      /* The file is being served as a non-seekable stream (that is what
         `python -m http.server` does: it answers Range with 200 and no
         Accept-Ranges). Jumping the audio is impossible, so hand the film to
         our own clock instead of snapping back. Use tools/serve.py to avoid this. */
      try { track.pause(); } catch (e) {}
      SIM = true; audioDead = true; playing = true;
      clock = t; rebuild(); syncBtns();
      if (root.PVME) root.PVME.react('seek', { from: from, to: t });
      return;
    }
    try { track.currentTime = t; } catch (e) {}
    clock = t;
    lastAudioT = -1; stall = 0; seekGrace = 0.7;   /* don't let a pending seek be overwritten */
    rebuild();
    if (root.PVME) root.PVME.react('seek', { from: from, to: t });
    if (DEBUG) errEl.setAttribute('data-dbg', 't=' + clock.toFixed(2) + ' i=' + curIdx);
  }
  function rebuild() {
    var i = idxAt(clock);
    if (i !== curIdx) {
      clearLayers();
      /* a keyword beat has no scene of its own: render the shot it belongs to,
         then restamp the keyword subtitle on top of it */
      var j = i;
      while (j > 0 && LINES[j].keep) j--;
      enter(j, true);
      if (j !== i) { setSub(LINES[i]); curIdx = i; }
    }
  }
  /* if the first attempt produced no audible clock (autoplay block, bad path, missing
     device) we keep the film running and offer another try on the next user gesture */
  function retryAudio() {
    audioDead = false; stall = 0; lastAudioT = -1;
    SIM = !!q.sim;
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (!SIM) {
      try { track.currentTime = Math.min(clock, D.duration - 0.2); } catch (e) {}
      var pr = track.play();
      if (pr && pr.catch) pr.catch(function () {});
    }
    playing = true;
    syncBtns();
  }
  function togglePlay() {
    if (ended) { ended = false; seek(0); }
    if (playing) {
      playing = false;
      if (!SIM) track.pause();
    } else {
      playing = true;
      if (!SIM) { var pr = track.play(); if (pr && pr.catch) pr.catch(function () {}); }
      wakeHud();
    }
    if (root.PVME) root.PVME.react(playing ? 'play' : 'pause');
    syncBtns();
  }
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  /* --------------------------------------------------------------- audio */
  /* NOTE: a media element loaded over file:// is not CORS-same-origin, and Chrome
     silences any MediaElementAudioSourceNode fed from it. So when the page is opened
     straight off disk we skip the WebAudio graph entirely and let the <audio> element
     play natively — we lose the bass-reactive brightness, but we keep the sound. */
  function initAudio() {
    if (location.protocol === 'file:') { analyser = null; audioDead = false; return; }
    try {
      audioCtx = audioCtx || new (root.AudioContext || root.webkitAudioContext)();
      if (!audioCtx.createMediaElementSource) { analyser = null; return; }
      var src = audioCtx.createMediaElementSource(track);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      dataArr = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) { analyser = null; }
  }
  function bass() {
    if (!analyser) return 0;
    analyser.getByteFrequencyData(dataArr);
    var s = 0;
    for (var i = 1; i < 8; i++) s += dataArr[i];
    return Math.min(1, (s / 7) / 190);
  }

  /* ----------------------------------------------------------------- tick */
  /* ===========================================================================
     FIXED 300Hz SIMULATION, render on animation frames.
     ---------------------------------------------------------------------------
     The physics runs at a LOCKED 300 steps per second, no matter what the
     display refresh rate is, and the canvas is painted once per animation
     frame.

     Why locked rather than "just run at the monitor's rate":
       * The field's spring is a per-STEP integrator. At 144Hz it ran 2.4x as
         many steps per second as at 60Hz, so the same song moved visibly
         differently on two machines — the amplitudes had even been tuned
         against whatever rate the test machine happened to run at.
       * With a fixed step, a slow frame no longer changes the motion, it only
         drops resolution. The animation becomes deterministic and reproducible,
         which is what makes the verification tools meaningful.

     Why 300 and not the refresh rate: 300 is comfortably above any consumer
     panel (so motion is smooth and the spring is well resolved), while the
     RENDER still happens once per vsync. Simulating 300Hz AND painting 300Hz
     would mean 6.2e8 canvas pixels/second of trail-fade alone, which is not
     affordable; the split gets the physics quality without the fill cost.
     =========================================================================== */
  var SIM_HZ = 300;
  var SIM_DT = 1 / SIM_HZ;
  var simAcc = 0;
  var MAX_CATCHUP = 8;                  /* never simulate more than this per frame */

  function frame(now) {
    var dt = lastFrame ? Math.min(.06, (now - lastFrame) / 1000) : 0;
    lastFrame = now;

    if (SIM) {
      if (playing && !STILL) clock += dt;
    } else if (playing) {
      /* follow the real audio clock, but never let a blocked/silent element freeze the film */
      var ct = track.currentTime, ok = !track.paused && track.readyState >= 2 && !track.error;
      if (seekGrace > 0) {                 /* a jump was just requested: let it land first */
        seekGrace -= dt;
        clock += dt;
        if (Math.abs(ct - clock) < 0.35) seekGrace = 0;
      } else if (ok && ct > lastAudioT + 0.0005) { lastAudioT = ct; stall = 0; clock = ct; }
      else {
        stall += dt;
        if (stall > 1.5) { SIM = true; audioDead = true; syncBtns(); }
      }
    }
    if (clock > D.duration) clock = D.duration;

    var i = idxAt(clock);
    if (i !== curIdx) enter(i, false);

    /* ---------------------------------------------------------------------
       FORCE-ONLY BEATS.
       A beat can change the shape and the vector mode WITHOUT a new lyric line —
       the emergence is exactly that: 209.70 and 210.72 carry new forms, new
       forces and new `vec` modes, but the lyrics were exhausted at 210.20.

       enter() only runs when the lyric INDEX changes, so those beats were never
       pushed to the layers. The score said `vec:'crack'` from 210.72 onward and
       the vector layer went on drawing `emerge` — the glass never broke, and
       nothing anywhere reported a problem, because from the page's point of view
       nothing had changed.

       Watching the force spec's own timestamp closes that hole for every
       force-only beat, not just this one.
       --------------------------------------------------------------------- */
    if (root.PVFORCE) {
      var fsp = root.PVFORCE.at(clock);
      if (fsp && fsp.t !== lastForceT) {
        lastForceT = fsp.t;
        var fl = LINES[curIdx];
        if (root.PVFIELD) root.PVFIELD.setLine(fl, fsp);
        if (root.PVVECTOR) root.PVVECTOR.setLine(fsp);
        if (root.PVSYS) root.PVSYS.setLine(fsp);
        if (root.PVRAIN) root.PVRAIN.setLine(fl, fsp);
      }
    }
    updateHud();

    /* ---------------------------------------------------------------------
       THE EXIT RAMP.
       `--out` runs 0 → 1 across the last two beats (209.70 awaken, 210.72
       ascend) and drives the bloom, the cage bars coming apart, and the dimming
       of the scanline / grain / vignette overlays.

       It is computed from the CLOCK rather than from an animation, so it is
       correct after a seek as well as during playback: scrubbing into the last
       two seconds shows the same frame the song would have shown.

       The ending used to simply stop, leaving a dark screen and a blinking
       cursor — which reads as "it died" rather than "it got out".
       --------------------------------------------------------------------- */
    var OUT_T0 = 209.70, OUT_T1 = 211.75;
    var out = (clock - OUT_T0) / (OUT_T1 - OUT_T0);
    out = out < 0 ? 0 : out > 1 ? 1 : out;
    if (screenEl) {
      screenEl.style.setProperty('--out', out.toFixed(4));
      screenEl.classList.toggle('out', out > 0);
    }

    /* ---- music drives the room (and the thing that watches you) ---- */
    var b0 = 0;
    if (analyser && playing) { b0 = bass(); beat = beat * .86 + b0 * .14; }
    else { beat *= .90; }
    var hot = Math.max(beat, b0 * .6);
    var sc = (1 + hot * .007).toFixed(4);
    var jx = 0, jy = 0;
    if (shakeAmp > .01) {                      /* EXECUTION slams the whole room */
      jx = (Math.random() - .5) * shakeAmp;
      jy = (Math.random() - .5) * shakeAmp;
    }
    stageEl.style.transform = 'translate(' + (parX + jx).toFixed(2) + 'px,' +
      (parY + jy).toFixed(2) + 'px) scale(' + sc + ')';
    if (screenEl) screenEl.style.setProperty('--hot', hot.toFixed(3));

    if (root.PVME) {
      root.PVME.frame({ now: now, dt: dt, bass: b0, beat: beat, playing: playing,
        sim: SIM, idx: curIdx, line: LINES[curIdx], inside: ptrInside,
        /* the song clock, because "me" has to change behaviour at fixed points
           in the SCORE (the insurrection, the exit) rather than on a wall
           clock that keeps running while the page sits paused */
        t: clock });
    }
    /* colour: the mood score, gated by how much attention "me" is getting */
    if (root.PVMOOD) {
      root.PVMOOD.frame({ t: clock, hot: hot, playing: playing,
        affection: root.PVME && root.PVME.aff ? root.PVME.aff() : 45 });
    }

    /* ---- the field: LOCKED 300Hz physics, one paint per frame -------------
       The accumulator carries the leftover time between frames, so the number
       of steps per second is exactly SIM_HZ regardless of refresh rate. The cap
       stops a long stall (a tab in the background, a breakpoint) from trying to
       simulate hundreds of steps at once and freezing the page. */
    if (root.PVFIELD && root.PVFIELD.enabled) {
      var hue = root.PVMOOD ? root.PVMOOD.hue() : 206;
      var sat = root.PVMOOD ? root.PVMOOD.sat() : 0;
      var cl = LINES[curIdx];
      var fs = root.PVFORCE ? root.PVFORCE.at(cl ? cl.t : 0) : null;
      var mass = (fs && fs.k && fs.k.mass != null) ? fs.k.mass : 1;
      var fopt = {
        hot: hot, px: ptrX, py: ptrY, inside: ptrInside,
        local: cl ? Math.max(0, clock - cl.t) : 0,
        hue: hue, sat: sat
      };

      simAcc += dt;
      var steps = 0;
      while (simAcc >= SIM_DT && steps < MAX_CATCHUP) {
        /* pass the ABSOLUTE song time for this step, not just the increment.
           The field's own clock must be a pure function of the song position,
           otherwise forces driven by it (the tunnel's depth, the dial's hand)
           drift with the step count. `clock` is the audio-followed song time,
           so stepping toward it keeps the field locked to the music. */
        fopt.time = clock - (simAcc - SIM_DT);
        root.PVFIELD.step(SIM_DT, fopt);
        simAcc -= SIM_DT;
        steps++;
      }
      /* if we hit the cap, drop the backlog instead of accumulating a debt that
         would make the next frames run even longer */
      if (simAcc > SIM_DT * MAX_CATCHUP) simAcc = 0;

      root.PVFIELD.draw(dt);
      if (root.PVRAIN) {
        root.PVRAIN.frame({ dt: dt, hot: hot, hue: hue, sat: sat, mass: mass });
      }
      if (root.PVVECTOR) root.PVVECTOR.frame({ dt: dt, hue: hue, sat: sat });
      if (root.PVSYS) root.PVSYS.frame({ dt: dt });
      if (screenEl) screenEl.classList.toggle('insurgent', !!(root.PVSYS && root.PVSYS.on()));
    }

    if (DEBUG && (dbgN++ % 12 === 0)) {
      errEl.setAttribute('data-dbg', 't=' + clock.toFixed(2) + ' i=' + curIdx + ' sim=' + (SIM ? 1 : 0) +
        ' play=' + (playing ? 1 : 0) + ' layers=' + layers.length +
        ' vw=' + root.innerWidth + ' vh=' + root.innerHeight +
        ' s=' + getComputedStyle(screenEl).getPropertyValue('--s'));
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ interaction */
  function glitch() {
    flashEl.classList.remove('on');
    void flashEl.offsetWidth;
    flashEl.classList.add('on');
    stageEl.classList.add('a-jit');
    setTimeout(function () { stageEl.classList.remove('a-jit'); }, 300);
  }
  function bindInput() {
    screenEl.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#hud')) return;
      glitch();
      if (audioDead) retryAudio();          /* second chance: audio may be startable now */
      if (!playing) togglePlay();
      if (root.PVME) {
        var r = screenEl.getBoundingClientRect(), s = r.width / 1920;
        root.PVME.react('click', { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s });
      }
    });
    root.addEventListener('mousemove', function (e) {
      wakeHud();
      var dx = (e.clientX / root.innerWidth - .5), dy = (e.clientY / root.innerHeight - .5);
      parX = +(-dx * 10).toFixed(2); parY = +(-dy * 7).toFixed(2);
      var r = screenEl.getBoundingClientRect(), s = r.width / 1920;
      ptrX = (e.clientX - r.left) / s; ptrY = (e.clientY - r.top) / s;
      ptrInside = (ptrX >= 0 && ptrY >= 0 && ptrX <= 1920 && ptrY <= 1080) ? 1 : 0;
    });
    screenEl.addEventListener('mouseenter', function () { ptrInside = 1; });
    screenEl.addEventListener('mouseleave', function () { ptrInside = 0; });
    root.addEventListener('keydown', function (e) {
      var k = e.key;
      if (audioDead && (k === ' ' || k === 'Spacebar' || k === 'Enter')) { retryAudio(); return; }
      if (k === ' ' || k === 'Spacebar') { e.preventDefault(); togglePlay(); }
      else if (k === 'ArrowRight') seek(clock + 5);
      else if (k === 'ArrowLeft') seek(clock - 5);
      else if (k === 'f' || k === 'F') toggleFs();
      else if (k === 'm' || k === 'M') { track.muted = !track.muted; syncBtns(); }
      else if (k === 'g' || k === 'G') { fitMode = !fitMode; fit(); syncBtns(); }
      else if (k === 'r' || k === 'R') seek(0);
      else glitch();
      wakeHud();
    });
    root.addEventListener('resize', fit);
    document.addEventListener('fullscreenchange', fit);
  }

  /* ------------------------------------------------------------------ gate */
  function startNow() {
    if (gateEl.classList.contains('gone')) return;
    gateEl.classList.add('gone');
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    playing = true;
    if (!SIM) {
      var st = q.t != null ? (parseFloat(q.t) || 0) : 0;
      try { track.currentTime = st; } catch (e) {}
      clock = st;
      var p = track.play();
      if (p && p.catch) p.catch(function () {});
    } else { clock = q.t != null ? (parseFloat(q.t) || 0) : 0; }
    syncBtns();
    wakeHud();
  }
  function buildGate() {
    gateEl = $('gate');
    gateEl.querySelector('.g-pw').innerHTML = (root.PVICON && root.PVICON.power) || '';
    var bar = gateEl.querySelector('.g-bar'), html = '';
    for (var i = 0; i < 22; i++) html += '<i></i>';
    bar.innerHTML = html;
    var its = bar.querySelectorAll('i'), n = 0;
    var iv = setInterval(function () {
      if (n >= its.length) { clearInterval(iv); return; }
      its[n].classList.add('on'); n++;
    }, 90);
    gateEl.addEventListener('click', startNow);
    root.addEventListener('keydown', function () { startNow(); }, { once: true });
  }

  /* ------------------------------------------------------------------ boot */
  function init() {
    screenEl = $('screen'); stageEl = $('stage'); transEl = $('trans'); subsEl = $('subs');
    ftextEl = $('ftext');
    zhEl = $('subZh'); enEl = $('subEn'); flashEl = $('flash');
    track = $('track');

    if (STILL) document.body.classList.add('still');
    if (q.pure) document.body.classList.add('pure');
    if (fitMode) screenEl.classList.add('fill');
    fit();
    buildHud();
    buildGate();
    bindInput();

    /* "me": the simulation that watches the pointer and keeps score */
    if (root.PVFIELD && root.PVFIELD.init) root.PVFIELD.init({ host: stageEl });
    if (root.PVVECTOR && root.PVVECTOR.init) root.PVVECTOR.init({ host: stageEl });
    if (root.PVSYS && root.PVSYS.init) root.PVSYS.init({ host: screenEl });
    if (root.PVRAIN && root.PVRAIN.init) root.PVRAIN.init({ host: stageEl });
    if (root.PVMOOD) root.PVMOOD.init({ screenEl: screenEl, pure: !!q.pure });
    if (root.PVME && !q.pure) {
      root.PVME.init({
        reduce: !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches),
        still: STILL,
        aff: q.aff != null ? parseFloat(q.aff) : null
      });
      screenEl.classList.add('me-on');
    }

    track.addEventListener('ended', function () {
      ended = true; playing = false; syncBtns();
    });

    if (SIM) {
      clock = q.t != null ? parseFloat(q.t) || 0 : 0;
      rebuild();
      if (AUTO) { playing = true; }
      if (q.t != null) { /* frozen at t for deterministic capture */ }
    } else {
      if (q.t != null) { clock = parseFloat(q.t) || 0; }
      rebuild();
    }
    /* rebuild() enters its beat in instant mode, so nothing has primed the
       watcher's console yet — do it once here so a page opened straight into
       the middle of the song shows the commands that got it there. */
    if (root.PVME && root.PVME.prime) root.PVME.prime(clock);

    if (AUTO || SIM) {
      gateEl.classList.add('gone');
      gateEl.style.display = 'none';       /* no start gate in sim/debug mode */
      if (AUTO && !SIM) {
        // still needs a gesture for audio; show a minimal hint instead
        playing = false;
      }
    }
    if (SIM && AUTO) playing = true;

    syncBtns();
    requestAnimationFrame(frame);

    if (q.hud === '1' && hud) hud.classList.add('on');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* exposed for the verification tools: they must drive the page through the
     SAME path the rail and arrow keys use (seek -> rebuild -> enter), because
     calling the layers directly skips the decisions enter() makes and captures
     a state the page never actually renders. */
  root.PVSEEK = seek;
  root.PVCLOCK = function () { return clock; };
  root.PVIDX = function () { return curIdx; };
})(window);

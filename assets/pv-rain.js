/* =========================================================================
   world.execute(me); — the rain
   King James Version, falling. Not decoration: this is the same story the song
   is telling, told in the older words, streaming down behind the field.

   Three densities, driven by how the section feels:
     drift   slow, sparse, wide  — the world being made
     stream  steady columns      — measurement, time, counting
     pour    fast, dense, hot    — the argument, the sentence, the deletion

   Plus a "decode" mode where a single verse condenses out of the rain and
   resolves into legible text, then falls apart again.
   ========================================================================= */
(function (root) {
  'use strict';

  var W = 1920, H = 1080;
  var cv, ctx, on = false, mode = 'drift', key = 'creation', seed = 0, clock = 0;
  var hue = 206, sat = 0, hot = 0, mass = 1;
  var DROPS = [], N = 0;
  var decodeText = '', decodeT = -1, decodeNext = 0;
  var MAXD = 130;

  var MODE = {
    drift:  { count: 26,  speed: [14, 34],  size: 19, alpha: .46, shard: .35 },
    stream: { count: 54,  speed: [40, 90],  size: 21, alpha: .56, shard: .7 },
    pour:   { count: 96,  speed: [120, 260], size: 23, alpha: .68, shard: .9 }
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function makeDrop(i, spread) {
    var m = MODE[mode] || MODE.drift;
    return {
      x: rnd(-60, W + 60),
      y: spread ? rnd(-H, H) : rnd(-H * 1.4, -40),
      v: rnd(m.speed[0], m.speed[1]),
      txt: '',
      w: 0,
      a: 0,
      size: m.size + rnd(-2, 3),
      life: 0,
      swap: rnd(1.5, 7),
      jitter: rnd(-1, 1)
    };
  }

  function refill(i, spread) {
    var d = DROPS[i] = makeDrop(i, spread);
    var m = MODE[mode] || MODE.drift;
    d.txt = Math.random() < m.shard
      ? root.PVBIBLE.shard(Math.random() + i)
      : root.PVBIBLE.pick(key, Math.random() + i * .37);
    return d;
  }

  /* RESOLUTION ADAPTATION: backing store at logical x render-scale, context
     scaled to match, so the drawing below stays in 1920x1080 logical space.
     Scripture rain is TEXT, and text is exactly what a 1.33x upscale on a 2.5K
     panel destroys first. */
  var RS = 1;
  function setRenderScale(s) {
    if (!(s > 0)) s = 1;
    RS = s;                                   /* remember, even before init */
    if (!cv) return;                          /* init() will apply it */
    var w = Math.round(W * s), h = Math.round(H * s);
    if (cv.width === w && cv.height === h) return;
    cv.width = w;
    cv.height = h;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
  }
  function resetTransform() { ctx.setTransform(RS, 0, 0, RS, 0, 0); }

  function init(o) {
    cv = document.createElement('canvas');
    cv.id = 'pvrain';
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;';
    o.host.insertBefore(cv, o.host.firstChild);
    ctx = cv.getContext('2d');
    setRenderScale(RS);
    for (var i = 0; i < MAXD; i++) refill(i, true);
    on = true;
  }

  /* which rain for which section */
  var RAIN = [
    [0.00,   'drift',  'creation'],
    [15.10,  'stream', 'creation'],
    [29.28,  'stream', 'measure'],
    [44.04,  'pour',   'dark'],
    [47.27,  'drift',  'dark'],
    [50.95,  'stream', 'time'],
    [58.65,  'stream', 'hunger'],
    [73.53,  'drift',  'organic'],
    [88.34,  'stream', 'gender'],
    [103.03, 'drift',  'completion'],
    [110.40, 'pour',   'forsaken'],
    [117.95, 'stream', 'vanity'],
    [125.33, 'pour',   'contend'],
    [147.52, 'pour',   'wrath'],
    [158.79, 'stream', 'babel'],
    [161.51, 'pour',   'wrath'],
    [176.96, 'drift',  'love'],
    [193.00, 'drift',  'love'],
    [205.56, 'pour',   'wrath'],
    [208.60, 'drift',  'renew'],
    [210.20, 'drift',  'renew']
  ];
  function rainAt(t) {
    var r = RAIN[0];
    for (var i = 0; i < RAIN.length; i++) if (t >= RAIN[i][0]) r = RAIN[i];
    return r;
  }

  function setLine(line, spec) {
    var r = rainAt(line.t);
    if (r[1] !== mode) {
      mode = r[1];
      /* re-time every drop for the new density instead of teleporting them */
      for (var i = 0; i < MAXD; i++) {
        DROPS[i].v = rnd((MODE[mode] || MODE.drift).speed[0], (MODE[mode] || MODE.drift).speed[1]);
        DROPS[i].size = (MODE[mode] || MODE.drift).size + rnd(-2, 3);
      }
    }
    if (r[2] !== key) {
      key = r[2];
      for (var j = 0; j < MAXD; j++) if (DROPS[j].w < .5) DROPS[j].txt = '';
    }
    N = (MODE[mode] || MODE.drift).count;
  }

  /* condense one verse out of the rain and let it resolve */
  function decode(txt) { decodeText = txt || ''; decodeT = 0; }

  function frame(o) {
    if (!on || !ctx) return;
    var dt = Math.min(.05, o.dt || .016);
    clock += dt;
    hue = o.hue == null ? hue : o.hue;
    sat = o.sat == null ? sat : o.sat;
    hot = o.hot || 0;
    mass = o.mass == null ? 1 : o.mass;

    resetTransform();                        /* includes the render scale */
    ctx.clearRect(0, 0, W, H);

    var m = MODE[mode] || MODE.drift;
    var lit = 62 + sat * 20;
    var base = 'hsl(' + hue.toFixed(0) + ',88%,' + lit.toFixed(0) + '%,';
    ctx.textBaseline = 'top';

    for (var i = 0; i < N; i++) {
      var d = DROPS[i];
      if (!d.txt) {
        if (clock > d.swap) { d = refill(i, false); } else continue;
      }
      d.y += d.v * dt * (1 + hot * .5);
      d.life += dt;
      /* fade in at the top, out at the bottom */
      var inA = Math.min(1, (d.y + 60) / 220);
      var outA = Math.min(1, Math.max(0, (H + 120 - d.y) / 260));
      d.a = m.alpha * inA * outA;

      if (d.y > H + 90) {
        d.y = rnd(-H * .5, -60);
        d.x = rnd(-60, W + 60);
        d.txt = Math.random() < m.shard
          ? root.PVBIBLE.shard(clock + i)
          : root.PVBIBLE.pick(key, clock + i * .37);
      }
      if (d.a <= .01) continue;

      var wobble = Math.sin(clock * .7 + i * 1.7) * 10;
      ctx.save();
      ctx.translate(d.x + wobble, d.y);
      /* column tilt reads as "data", not as a paragraph */
      ctx.rotate(-Math.PI / 2);
      ctx.font = '400 ' + d.size.toFixed(1) + 'px "Cascadia Mono", Consolas, monospace';
      ctx.fillStyle = base + (d.a * (1 - mass * .55)).toFixed(3) + ')';
      ctx.fillText(d.txt, 0, 0);
      ctx.restore();
    }

    /* ---- the verse that condenses out and becomes readable ----------------
       Placed in the lower-middle clear zone (y ~858). It must NOT land in the
       burnt-in subtitle band (y 916..1050) or it fights the lyric.            */
    if (decodeT >= 0) {
      decodeT += dt;
      var k = Math.min(1, decodeT / 1.1);
      var fade = decodeT < 3.6 ? Math.min(1, decodeT / 1.1) : Math.max(0, 1 - (decodeT - 3.6) / 1.2);
      ctx.save();
      ctx.font = '300 ' + (32 + (1 - k) * 22).toFixed(0) + 'px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      /* dim it while the big EXECUTION word owns the centre */
      ctx.fillStyle = 'hsl(' + hue.toFixed(0) + ',34%,94%,' +
        (fade * (mode === 'pour' ? .30 : .58)).toFixed(3) + ')';
      ctx.fillText(decodeText, W / 2, 884);
      ctx.restore();
      if (decodeT > 5) decodeT = -1;
    }
  }

  root.PVRAIN = {
    init: init, frame: frame, setLine: setLine, decode: decode,
    setRenderScale: setRenderScale,
    on: function () { return on; }, mode: function () { return mode; }
  };
})(window);

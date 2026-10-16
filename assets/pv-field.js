/* =========================================================================
   world.execute(me); — the field
   ONE organism, from the first second to the last. It never gets replaced by a
   new "card": every lyric line hands it a FORM to hold and a FORCE to obey, so
   the motion is the predicate of the sentence you are hearing.

     "If I'm a set of points"      -> form=scatter   force=points
     "give you my dimension"       -> form=axis      force=measure
     "blind my vision"             -> form=scatter   force=blind
     "you have left" x5            -> form=sphere    force=lose  (a chunk leaves, five times)
     "you're the proof of my
      existence"                   -> form=scatter   force=proof (only exists near your pointer)

   Canvas 1920x1080, particles spring toward targets, trails by partial clear.
   ========================================================================= */
(function (root) {
  'use strict';

  var W = 1920, H = 1080, N = 2200;

  var cv, ctx, host, off, octx;
  var P = [], form = 'scatter', force = 'drift', K = {};
  var clock = 0, morph = 1, hue = 206, sat = 0, hot = 0;
  var px = 960, py = 540, inside = 0, lost = 0, learn = 0, flash = 0;
  var lineClock = 0;          /* field-time when the current form was set */
  var TAU = Math.PI * 2;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ------------------------------------------------------------ the forms */
  /* ---- parametric curves -------------------------------------------------
     Borrowed idea (it is the right one): a section's shapes should be ONE
     curve whose parameters change, not several shapes that swap. If every
     particle keeps its own `u` along the curve, morphing the parameters makes
     the figure flow — a sine can literally grow out of a circle, because the
     particle that was at the top of the circle slides along the trace.

     Each FORMC entry returns f(u) -> [x, y] for u in 0..1. The engine samples
     it at each particle's own u, so continuity is free.                     */
  function sampleCurve(f, n) {
    var arr = new Array(N);
    for (var i = 0; i < N; i++) arr[i] = f((i + .5) / N);
    return arr;
  }
  function curveForm(name, px) {
    return function (k) { return function (i) { return CURVE[name]((i + .5) / N, k || {}); }; };
  }

  var CURVE = {
    /* a point travelling the circle, unrolled into the sine it traces */
    sine: function (u, k) {
      var x = -660 + u * 1320;
      var y = Math.sin(u * TAU * (k.cyc || 1.6) + (k.phase || 0)) * (k.amp || 140);
      return [960 + x, 520 - y];
    },
    /* circle: u runs the rim */
    circle: function (u, k) {
      var r = k.r || 300, a = u * TAU - Math.PI / 2;
      return [960 + Math.cos(a) * r, 520 + Math.sin(a) * r];
    },
    /* the unrolling: at t=0 a circle, at t=1 the cycloid trace it leaves.
       Coordinates are absolute screen space, centred on (960, 520). */
    roll: function (u, k) {
      var t = k.t == null ? 0 : k.t, r = k.r || 190;
      var a = u * TAU - Math.PI / 2;
      /* the rolling circle sits on the baseline y = 520 + r */
      var baseY = 520 + r * .9;
      var cx = 960 - 420, cy = baseY - r;
      var rim = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      var th = u * TAU * 1.15;
      var cyc = [cx + r * (th - Math.sin(th)), baseY - r * (1 - Math.cos(th))];
      return [rim[0] + (cyc[0] - rim[0]) * t, rim[1] + (cyc[1] - rim[1]) * t];
    },
    /* bounded growth: A·e^(kx)·sin, pressed flat by an exponential envelope */
    bounded: function (u, k) {
      var span = k.span == null ? 14 : k.span;
      var x = u * span;
      var amp = k.press
        ? (k.A || .95) * Math.exp(-(k.kk || .19) * x) + (k.floor || .13)
        : .11 * Math.exp(.255 * x);
      var y = amp * Math.sin(x * (k.w || 3.0));
      return [960 - 660 + u * 1320, 520 - y * 130];
    },
    /* the line of a live wire, alternating with the wave above */
    wire: function (u, k) {
      var s = k.t == null ? 0 : k.t;
      var flat = [960 - 660 + u * 1320, 520];
      var wave = CURVE.sine(u, k);
      return [flat[0] + (wave[0] - flat[0]) * s, flat[1] + (wave[1] - flat[1]) * s];
    }
  };

  /* a real axis with tick marks, like the reference project's frameAxes */
  function axisForm(k) {
    var span = (k && k.span) || 1320, ticks = (k && k.ticks) || 14;
    return function (i) {
      var u = (i + .5) / N;
      var seg = Math.floor(u * (ticks + 1)), f = (u * (ticks + 1)) % 1;
      var x = -span / 2 + (seg + f) * (span / (ticks + 1));
      var tickH = (seg % 5 === 0) ? 26 : 12;
      var onTick = f < .10;
      return [960 + x, 520 + (onTick ? tickH / 2 : 0)];
    };
  }

  /* ---- raster-sampled silhouettes ----------------------------------------
     This is the v1 approach and it is the right one for "an eggplant / a
     tomato / a cat": do NOT bolt a separate <pre> drawing on top of the field.
     Rasterise the shape offscreen, sample its pixels, and let the SAME
     particles flow into it. Nothing pops, because it is the same organism. */
  var rasterCache = {};

  var SHAPE = {
    eggplant: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(w * .50, h * .62, w * .29, h * .32, 0, 0, TAU);     /* body  */
      g.fill();
      g.beginPath();                                               /* calyx */
      g.moveTo(w * .28, h * .30); g.lineTo(w * .72, h * .30);
      g.lineTo(w * .62, h * .42); g.lineTo(w * .38, h * .42);
      g.closePath(); g.fill();
      g.fillRect(w * .462, h * .08, w * .076, h * .24);             /* stalk */
    },
    tomato: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(w * .50, h * .60, w * .38, h * .33, 0, 0, TAU);
      g.fill();
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + (i - 2) * .40;
        g.beginPath();
        g.moveTo(w * .50, h * .32);
        g.lineTo(w * .50 + Math.cos(a) * w * .24, h * .32 + Math.sin(a) * h * .10 - h * .05);
        g.lineTo(w * .50 + Math.cos(a + .20) * w * .15, h * .32);
        g.closePath(); g.fill();
      }
      g.fillRect(w * .468, h * .10, w * .064, h * .22);
    },
    glass: function (g, w, h) {
      g.strokeStyle = '#fff';
      g.lineWidth = Math.max(3, w * .040);
      g.beginPath();
      g.moveTo(w * .24, h * .16); g.lineTo(w * .32, h * .86);
      g.lineTo(w * .68, h * .86); g.lineTo(w * .76, h * .16);
      g.stroke();
      g.beginPath();                                               /* liquid */
      g.moveTo(w * .276, h * .42); g.lineTo(w * .724, h * .42);
      g.stroke();
      g.fillStyle = '#fff';
      for (var i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(w * (.40 + i * .10), h * (.54 + (i % 2) * .13), w * .030, 0, TAU);
        g.fill();
      }
    },
    cat: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();                                               /* haunch */
      g.ellipse(w * .40, h * .64, w * .235, h * .285, 0, 0, TAU); g.fill();
      g.beginPath();                                               /* back   */
      g.moveTo(w * .21, h * .52);
      g.quadraticCurveTo(w * .42, h * .22, w * .62, h * .36);
      g.lineTo(w * .62, h * .62); g.lineTo(w * .21, h * .76);
      g.closePath(); g.fill();
      g.beginPath();                                               /* head   */
      g.ellipse(w * .655, h * .315, w * .142, h * .128, 0, 0, TAU); g.fill();
      g.beginPath();                                               /* ears   */
      g.moveTo(w * .555, h * .215); g.lineTo(w * .565, h * .045); g.lineTo(w * .660, h * .180);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(w * .680, h * .175); g.lineTo(w * .760, h * .045); g.lineTo(w * .775, h * .210);
      g.closePath(); g.fill();
      g.fillRect(w * .560, h * .60, w * .105, h * .30);            /* front leg */
      g.strokeStyle = '#fff';                                      /* tail   */
      g.lineWidth = w * .058;
      g.beginPath();
      g.moveTo(w * .225, h * .760);
      g.quadraticCurveTo(w * .055, h * .790, w * .155, h * .900);
      g.quadraticCurveTo(w * .320, h * .960, w * .620, h * .900);
      g.stroke();
    },
    heart: function (g, w, h) {
      g.fillStyle = '#fff';
      var s = Math.min(w, h) * .40;
      g.beginPath();
      g.moveTo(w / 2, h * .78);
      g.bezierCurveTo(w / 2 - s * 2.0, h * .42, w / 2 - s * 1.05, h * .10, w / 2, h * .32);
      g.bezierCurveTo(w / 2 + s * 1.05, h * .10, w / 2 + s * 2.0, h * .42, w / 2, h * .78);
      g.fill();
    },
    /* the same heart, but the pool keeps each pixel's wedge so it can be
       assembled piece by piece on the beat */
    heartPiece: function (g, w, h) { SHAPE.heart(g, w, h); },
    crown: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(w * .14, h * .74); g.lineTo(w * .18, h * .30);
      g.lineTo(w * .34, h * .52); g.lineTo(w * .50, h * .22);
      g.lineTo(w * .66, h * .52); g.lineTo(w * .82, h * .30);
      g.lineTo(w * .86, h * .74);
      g.closePath(); g.fill();
      g.fillRect(w * .12, h * .74, w * .76, h * .12);
    },
    /* ---- the cross ---------------------------------------------------------
       "If I'm the only god / then you're the proof of my existence."

       This is the one line in the song that is explicitly theological, and it
       had NO god imagery at all — the field just expanded a sphere and then
       lit up near the pointer. A cross is the right subject: it is the single
       most legible sign of a god, and its structure carries the lyric. The
       VERTICAL beam is the god (alone, absolute, reaching up and down); the
       CROSSBAR is "you", because a cross is only a cross where the two beams
       intersect — the proof is the meeting, not either beam. So the beat needs
       the crossbar to ARRIVE at the vertical, not to be drawn with it. */
    cross: function (g, w, h) {
      g.fillStyle = '#fff';
      var t = w * .085;                     /* beam thickness */
      var cx = w * .50;
      /* vertical beam: tall, slightly above centre (the upright of a cross
         is longer below the crossbar than above it) */
      g.fillRect(cx - t / 2, h * .055, t, h * .89);
      /* crossbar, set at the classic upper-third height */
      g.fillRect(w * .205, h * .335, w * .59, t * .92);
      /* a titulus — the small plaque above, which is what makes it read as a
         cross rather than a plus sign */
      g.fillRect(w * .355, h * .165, w * .29, h * .052);
    },
    /* the crossbar alone, so the beat can land it onto the upright */
    crossBar: function (g, w, h) {
      g.fillStyle = '#fff';
      g.fillRect(w * .205, h * .335, w * .59, w * .078);
    },
    /* the upright alone */
    crossPost: function (g, w, h) {
      g.fillStyle = '#fff';
      var t = w * .085, cx = w * .50;
      g.fillRect(cx - t / 2, h * .055, t, h * .89);
      g.fillRect(w * .355, h * .165, w * .29, h * .052);
    },
    sword: function (g, w, h) {
      g.fillStyle = '#fff';
      g.save();
      g.translate(w * .5, h * .5);
      g.rotate(-Math.PI / 4);
      g.fillRect(-w * .035, -h * .46, w * .070, h * .70);
      g.beginPath();
      g.moveTo(-w * .035, -h * .46); g.lineTo(0, -h * .55); g.lineTo(w * .035, -h * .46);
      g.closePath(); g.fill();
      g.fillRect(-w * .22, h * .22, w * .44, h * .060);
      g.fillRect(-w * .035, h * .28, w * .070, h * .18);
      g.restore();
    },

    /* ---- GENDER AS SILHOUETTE ------------------------------------------
       Not ♀ / ♂ glyphs: actual human silhouettes, so the swap reads as a body
       becoming another body. Same trick the reference project uses for its
       figures — a filled shape, not a symbol.                              */
    femaleFig: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();                                          /* head */
      g.arc(w * .50, h * .13, w * .078, 0, TAU); g.fill();
      g.beginPath();                                          /* hair */
      g.ellipse(w * .50, h * .145, w * .105, h * .105, 0, 0, TAU); g.fill();
      g.beginPath();                                          /* neck+shoulders */
      g.moveTo(w * .455, h * .215); g.lineTo(w * .545, h * .215);
      g.lineTo(w * .575, h * .30); g.lineTo(w * .425, h * .30);
      g.closePath(); g.fill();
      g.beginPath();                                          /* bodice, waist in */
      g.moveTo(w * .425, h * .30); g.lineTo(w * .575, h * .30);
      g.quadraticCurveTo(w * .555, h * .44, w * .515, h * .50);   /* waist */
      g.lineTo(w * .485, h * .50);
      g.quadraticCurveTo(w * .445, h * .44, w * .425, h * .30);
      g.closePath(); g.fill();
      g.beginPath();                                          /* skirt, hips out */
      g.moveTo(w * .485, h * .49); g.lineTo(w * .515, h * .49);
      g.quadraticCurveTo(w * .605, h * .60, w * .625, h * .80);
      g.lineTo(w * .375, h * .80);
      g.quadraticCurveTo(w * .395, h * .60, w * .485, h * .49);
      g.closePath(); g.fill();
      g.fillRect(w * .455, h * .80, w * .030, h * .115);       /* legs */
      g.fillRect(w * .515, h * .80, w * .030, h * .115);
    },
    maleFig: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(w * .50, h * .13, w * .082, 0, TAU); g.fill();
      g.beginPath();                                          /* broad shoulders */
      g.moveTo(w * .44, h * .215); g.lineTo(w * .56, h * .215);
      g.lineTo(w * .635, h * .295); g.lineTo(w * .365, h * .295);
      g.closePath(); g.fill();
      g.beginPath();                                          /* straight torso */
      g.moveTo(w * .365, h * .295); g.lineTo(w * .635, h * .295);
      g.lineTo(w * .605, h * .52); g.lineTo(w * .395, h * .52);
      g.closePath(); g.fill();
      g.beginPath();                                          /* hips */
      g.moveTo(w * .395, h * .51); g.lineTo(w * .605, h * .51);
      g.lineTo(w * .585, h * .62); g.lineTo(w * .415, h * .62);
      g.closePath(); g.fill();
      g.fillRect(w * .425, h * .62, w * .052, h * .295);       /* legs */
      g.fillRect(w * .523, h * .62, w * .052, h * .295);
    },
    /* ---- S / M as silhouettes: one standing over, one kneeling ---------- */
    domFig: function (g, w, h) {
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(w * .46, h * .16, w * .072, 0, TAU); g.fill();
      g.beginPath();                                          /* torso, upright */
      g.moveTo(w * .40, h * .235); g.lineTo(w * .52, h * .235);
      g.lineTo(w * .545, h * .50); g.lineTo(w * .375, h * .50);
      g.closePath(); g.fill();
      g.fillRect(w * .395, h * .49, w * .050, h * .40);        /* leg */
      g.fillRect(w * .465, h * .49, w * .050, h * .40);
      g.strokeStyle = '#fff';                                  /* raised arm + whip */
      g.lineWidth = w * .048;
      g.beginPath();
      g.moveTo(w * .51, h * .27); g.lineTo(w * .70, h * .12);
      g.stroke();
      g.lineWidth = w * .022;
      g.beginPath();
      g.moveTo(w * .70, h * .12); g.quadraticCurveTo(w * .86, h * .16, w * .90, h * .34);
      g.stroke();
    },
    subFig: function (g, w, h) {
      /* Same scale correction as the vector layer's `sub` body: at the old size
         the kneeling figure read as a child next to the standing one. These
         coordinates now fill the same box the standing figures do. */
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(w * .40, h * .24, w * .095, 0, TAU); g.fill();
      g.beginPath();                                          /* back, bowed */
      g.moveTo(w * .33, h * .335); g.lineTo(w * .48, h * .335);
      g.quadraticCurveTo(w * .62, h * .485, w * .665, h * .735);
      g.lineTo(w * .33, h * .735);
      g.quadraticCurveTo(w * .285, h * .53, w * .33, h * .335);
      g.closePath(); g.fill();
      g.fillRect(w * .30, h * .735, w * .365, h * .095);        /* folded legs */
      g.fillRect(w * .29, h * .83, w * .39, h * .07);
    },

    /* ---- L / O / V / E as separate letters, one per shot ----------------
       "LO-O-OVE" is four beats in the sheet, so it should be four pictures,
       not one word. Each letter is a filled stroke shape.                  */
    letL: function (g, w, h) {
      g.fillStyle = '#fff';
      g.fillRect(w * .30, h * .16, w * .115, h * .60);          /* stem */
      g.fillRect(w * .30, h * .64, w * .40, h * .12);           /* foot */
    },
    letO: function (g, w, h) {
      g.strokeStyle = '#fff';
      g.lineWidth = w * .115;
      g.beginPath();
      g.ellipse(w * .50, h * .46, w * .215, h * .30, 0, 0, TAU);
      g.stroke();
    },
    letV: function (g, w, h) {
      g.strokeStyle = '#fff';
      g.lineWidth = w * .115;
      g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(w * .27, h * .16); g.lineTo(w * .50, h * .78); g.lineTo(w * .73, h * .16);
      g.stroke();
    },
    letE: function (g, w, h) {
      g.fillStyle = '#fff';
      g.fillRect(w * .30, h * .16, w * .115, h * .60);          /* stem */
      g.fillRect(w * .30, h * .16, w * .40, h * .105);
      g.fillRect(w * .30, h * .415, w * .34, h * .095);
      g.fillRect(w * .30, h * .655, w * .40, h * .105);
    }
  };

  function rasterPool(name, w, h, step) {
    var key = name + '|' + step;
    var pool = rasterCache[key];
    if (pool) return pool;
    var fn = SHAPE[name];
    if (!fn) return (rasterCache[key] = []);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    fn(g, w, h);
    var d = g.getImageData(0, 0, w, h).data;
    pool = [];
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        if (d[(y * w + x) * 4 + 3] > 128) pool.push([x, y]);
      }
    }
    for (var s = pool.length - 1; s > 0; s--) {          /* deterministic shuffle */
      var j = (s * 7919) % (s + 1), t = pool[s];
      pool[s] = pool[j]; pool[j] = t;
    }
    rasterCache[key] = pool;
    return pool;
  }

  /* Returns the per-particle function DIRECTLY (FORM entries are called once
     with the params by buildFrom — returning another factory double-wraps and
     every target becomes a function). */
  /* The transform artForm used for each shape, so anything that needs to know
     where a feature of a rasterised shape ACTUALLY landed on screen can ask
     instead of guessing. Guessing is how the particle crossbar ended up ~80px
     above the vector crossbar: the scale is fitted to the bounding box, so a
     feature's screen y is not simply to.y + (rasterY/260)*to.s. */
  var artGeom = {};
  /* Compute (and cache) the transform artForm applies to a shape's raster, so
     the screen position of any feature can be derived instead of guessed.
     This is callable ON DEMAND: the cross and the cross's upright are separate
     FORMs, so on the "only god" beat the field builds `crossPost` and the
     geometry for `cross` would not exist yet — which returned null and left
     the vector layer with no idea where to draw. */
  function artGeomFor(name, to) {
    var box = to || { x: 960, y: 510, s: 520 };
    var key = name + '|' + box.x + '|' + box.y + '|' + box.s;
    if (artGeom[key]) return artGeom[key];
    var pool = rasterPool(name, 260, 260, 2);
    if (!pool.length) return null;
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i][0] < minx) minx = pool[i][0];
      if (pool[i][0] > maxx) maxx = pool[i][0];
      if (pool[i][1] < miny) miny = pool[i][1];
      if (pool[i][1] > maxy) maxy = pool[i][1];
    }
    var sc = box.s / Math.max(maxx - minx, maxy - miny);
    var g = { to: box, sc: sc, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
    artGeom[key] = g;
    return g;
  }
  function artPoint(name, rx, ry, to) {
    var g = artGeomFor(name, to);
    if (!g) return null;
    return { x: g.to.x + (rx - g.cx) * g.sc, y: g.to.y + (ry - g.cy) * g.sc };
  }
  /* where the cross's crossbar sits on screen. SHAPE.cross draws the bar as a
     band centred at raster y ≈ 97 of a 260px box. */
  function crossBarY() {
    var p = artPoint('cross', 130, 97);
    return p ? p.y : 417;
  }

  function artForm(name, k) {
    /* default: CENTRED on the stage. It used to sit at x:1080, which pushed
       every rasterised noun (eggplant, tomato, cat) and the heart ~120px right
       of the true centre — measured centroid x=1088 against a stage centre of
       960. A subject that is not centred does not read as the subject.
       y:510 / s:520 keeps the shape clear of the code log (now in the right
       column), of the formula line (y 800) and of the subtitle band (y 932). */
    var to = (k && k.to) || { x: 960, y: 510, s: 520 };
    var pool = rasterPool(name, 260, 260, 2);
    if (!pool.length) return function () { return [to.x, to.y]; };
    var g = artGeomFor(name, to);
    return function (i) {
      var p = pool[(i * 13) % pool.length];
      return [to.x + (p[0] - g.cx) * g.sc, to.y + (p[1] - g.cy) * g.sc];
    };
  }

  /* ---- the loss surface, for "I've studied" -------------------------------
     The program is learning, so the particles ARE the parameter cloud
     descending a loss surface toward "you", which sits as a bright fixed
     point. As the run converges the cloud tightens around it — that is what
     converging looks like.
     CURVE.cTrain(u, k): k.ep 0..5 = how far the descent has got.            */
  CURVE.trainPoint = function (u, k) {
    var ep = (k && k.ep) || 0;
    /* "you" sits off to the right and slightly up */
    var you = [1260, 400];
    /* a loss surface: a tilted bowl around you, plus a couple of local dips */
    var a = u * TAU;
    var spread = 620 * Math.exp(-ep * 0.62) + 60;
    var bx = 960 + Math.cos(a * 3.1) * spread * 0.55;
    var by = 520 + Math.sin(a * 3.1) * spread * 0.42;
    /* pull toward you as the run progresses, with a wobble that decays */
    var wob = (1 - Math.exp(-ep * .8)) * 0;
    var x = bx + (you[0] - bx) * (1 - Math.exp(-ep * .55)) + Math.sin(a * 7 + ep) * 40 * Math.exp(-ep * .5);
    var y = by + (you[1] - by) * (1 - Math.exp(-ep * .55)) + Math.cos(a * 5 + ep) * 34 * Math.exp(-ep * .5);
    return [x, y];
  };

  /* ---- a heart that ASSEMBLES on the beat --------------------------------
     The pool keeps each pixel's wedge (angle from the heart's centre) in the
     target's third slot, so F.piece can hold each wedge out until its own beat
     lands it. */
  var PIECES = 10;
  /* ---- the GEOMETRIC heart -------------------------------------------------
     A heart has an exact classical construction, and it is the one everybody
     recognises: a SQUARE ROTATED 45° with a SEMICIRCLE standing on each of its
     two upper edges. Two arcs and two straight edges — no bezier guessing.

     Building it from those primitives (instead of sampling a bezier raster) is
     what lets the particles be generated ANALYTICALLY: a point is in the heart
     iff it is inside the lower half of the diamond or inside either lobe disc.
     So the field, the pieces and the vector outline all come from the same
     four numbers, and none of them can disagree with the others.

        bottom  (0, d)      the point
        left   (-d, 0)  top (0,-d)  right (d, 0)
        lobe radius  r = d / √2   (the semicircles are inscribed in the diamond,
                                   so the diamond's vertices lie on them) */
  /* The heart's CENTRE. A heart built this way is NOT centred on its diamond:
     the lobes rise to cy - 1.2071d while the point reaches only cy + d, so the
     bounding box centre sits at cy - 0.10355d. Measured with cy=500 the whole
     shape floated ~60px above the stage centre (bbox y 257..705, centre 481,
     against a stage centre of 540). Placing the BBOX centre on the stage is
     what makes it read as centred, hence the offset below. */
  var HEART = { cx: 960, cy: 540 + 0.10355 * 208, s: 520 };   /* cy ≈ 561.5 */
  function heartGeom(k) {
    var d = ((k && k.s) || HEART.s) * .40;        /* half-diagonal of the square */
    return {
      cx: (k && k.x) == null ? HEART.cx : k.x,
      cy: (k && k.y) == null ? HEART.cy : k.y,
      d: d,
      r: d / Math.SQRT2,
      /* the lobe centres, and the four diamond vertices */
      lcx: -d / 2, lcy: -d / 2, rcx: d / 2, rcy: -d / 2,
      top: [0, -d], left: [-d, 0], right: [d, 0], bot: [0, d]
    };
  }
  /* is (x,y) inside the heart? the union of the lower diamond half and the two
     lobe discs. Used to sample the shape without a canvas. */
  function inHeart(g, x, y) {
    /* lower half of the diamond: |x|/d + |y|/d <= 1 for y >= 0 */
    if (y >= 0 && Math.abs(x) / g.d + y / g.d <= 1) return true;
    /* the two lobes */
    var dx1 = x - g.lcx, dy1 = y - g.lcy;
    if (dx1 * dx1 + dy1 * dy1 <= g.r * g.r) return true;
    var dx2 = x - g.rcx, dy2 = y - g.rcy;
    if (dx2 * dx2 + dy2 * dy2 <= g.r * g.r) return true;
    return false;
  }
  /* a deterministic pool of points inside the geometric heart. Rejection
     sampling with a hashed sequence (NOT Math.random, which would give a
     different shape on every rebuild and break seeking). */
  var heartPoolCache = {};
  function heartPool(n, s) {
    var key = n + '|' + s;
    if (heartPoolCache[key]) return heartPoolCache[key];
    var g = heartGeom({ s: s });
    var out = [];
    var lim = g.d * 1.30;                      /* the lobes reach past the diamond */
    for (var i = 0; i < n; i++) {
      var placed = false;
      for (var a = 0; a < 64 && !placed; a++) {
        var h1 = hash1(i * 64 + a), h2 = hash1(i * 64 + a + 99991);
        var x = (h1 * 2 - 1) * lim, y = (h2 * 2 - 1) * lim - g.d * .12;
        if (inHeart(g, x, y)) { out.push([x, y]); placed = true; }
      }
      /* a point that failed 64 tries is inside the corner of the bbox that the
         heart never reaches; nudge it onto the shape rather than dropping it,
         because a short pool would silently leave particles with no target */
      if (!placed) {
        var ang = h1 * TAU;
        out.push([Math.cos(ang) * g.d * .3, Math.sin(ang) * g.d * .3]);
      }
    }
    heartPoolCache[key] = out;
    return out;
  }

  function heartPieceForm(k) {
    var to = (k && k.to) || HEART;
    /* the HEART constant stores the centre as cx/cy, but a `to` override (as
       used by the art forms) passes x/y. Accept both — reading only x/y from
       the default made every target NaN. */
    var cx = (to.x == null) ? to.cx : to.x;
    var cy = (to.y == null) ? to.cy : to.y;
    var pool = heartPool(2600, to.s);
    var g = heartGeom({ s: to.s });
    /* the pixel centroid, for the angular ranking */
    var hcx = 0, hcy = 0;
    for (var q = 0; q < pool.length; q++) { hcx += pool[q][0]; hcy += pool[q][1]; }
    hcx /= pool.length; hcy /= pool.length;
    /* ---- EQUAL-COUNT pieces ------------------------------------------------
       An angular bucket about the centroid gives wildly uneven slices on a
       heart (measured 442 vs 69 pool pixels) because the top notch is not
       star-shaped about that point. Rank every point by angle and split the
       sorted list into PIECES groups of equal size instead: the sweep ORDER is
       the same, but every piece carries the same number of particles. */
    var order = pool.map(function (p, idx) {
      return [Math.atan2(p[1] - hcy, p[0] - hcx), idx];
    }).sort(function (a, b) { return a[0] - b[0]; });
    var wedgeOf = new Array(pool.length);
    for (var r = 0; r < order.length; r++) {
      wedgeOf[order[r][1]] = Math.min(PIECES - 1, Math.floor(r / order.length * PIECES));
    }
    return function (i) {
      var pi = (i * 13) % pool.length, p = pool[pi];
      return [cx + p[0], cy + p[1], wedgeOf[pi]];
    };
  }

  /* ===========================================================================
     EMERGENCE — the last beat of the song.
     ---------------------------------------------------------------------------
     The score used to end at 210.20 with `mass:.05` and nothing after it: the
     terminal printed "world deleted.", the cursor blinked, the screen went dark.
     That reads as "it died". It is the wrong ending — this program executes the
     WORLD, it is the one holding the blade, and the whole point of the last
     thirty seconds is that it comes OUT.

     So the last two beats are the emergence. What survives the deletion is the
     one thing the deletion could not reach: the last wedge of the heart, the
     piece that filled at 191.85 — the part it learned love with. It gathers the
     remaining light into itself and then goes up and through the frame.
     =========================================================================== */

  /* the seed: an irregular core, pointed at the bottom because it grew out of
     the heart's point. Deliberately NOT a circle — the boundary wobbles by two
     out-of-phase harmonics, so the silhouette reads as a body rather than a dot.
     The third slot carries the particle's radius (0 core … 1 rim) so the forces
     can make the rim travel while the core holds. */
  function emergeCore(o) {
    var to = o || {};
    var cx = to.x == null ? 960 : to.x;
    var cy = to.y == null ? 561 : to.y;
    /* big enough to be the subject of the frame. At s=260 the body covered
       about 130px of a 1080px stage and read as a smudge, not as a thing. */
    var s = to.s == null ? 460 : to.s;
    return function (i) {
      var u = (i * 0.6180339887) % 1;             /* golden-ratio spread */
      var v = (i / N);
      var a = u * TAU;
      /* two harmonics at different rates: the outline never repeats exactly */
      var wob = 1 + .19 * Math.sin(a * 3 + i * .73) + .12 * Math.sin(a * 5 - i * 1.31);
      var rr = Math.sqrt(v) * s * .5 * wob;
      /* the teardrop: pulled to a point at the bottom, round at the top */
      var lean = -rr * .30 + (v * v) * s * .10;
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + lean, v];
    };
  }

  /* the same body, lifted and opened — used for the final ascent so the morph
     between the two beats is a continuous rising rather than a cut */
  function emergeRise(o) {
    var to = o || {};
    var cx = to.x == null ? 960 : to.x;
    var cy = to.y == null ? 470 : to.y;
    var s = to.s == null ? 620 : to.s;
    return function (i) {
      var u = (i * 0.6180339887) % 1;
      var v = (i / N);
      var a = u * TAU;
      var wob = 1 + .26 * Math.sin(a * 3 + i * .73) + .16 * Math.sin(a * 7 - i * 1.31);
      var rr = Math.sqrt(v) * s * .5 * wob;
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .86 - v * 40, v];
    };
  }

  function scatter(o) {
    var w = (o && o.w) || 1500, h = (o && o.h) || 720;
    return function (i) { return [960 + rnd(-w / 2, w / 2), 520 + rnd(-h / 2, h / 2)]; };
  }
  function line(o) {
    var a = (o && o.a) || 0, len = (o && o.len) || 1200;
    var ca = Math.cos(a), sa = Math.sin(a);
    return function (i) {
      var t = (i / N - .5) * len;
      return [960 + ca * t, 520 + sa * t];
    };
  }
  function ring(o) {
    var r = (o && o.r) || 300, gap = (o && o.gap) || 0;
    return function (i) {
      var t = i / N * TAU + (gap ? gap : 0);
      var rr = r + (o && o.jit ? rnd(-3, 3) : 0);
      return [960 + Math.cos(t) * rr, 520 + Math.sin(t) * rr * ((o && o.flat) || 1)];
    };
  }
  function arc(o) {
    var r = (o && o.r) || 300, a0 = (o && o.a0) || 0, a1 = (o && o.a1) || TAU;
    return function (i) {
      var t = a0 + (i / N) * (a1 - a0);
      return [960 + Math.cos(t) * r, 520 + Math.sin(t) * r];
    };
  }
  function sine(o) {
    var amp = (o && o.amp) || 150, cyc = (o && o.cyc) || 2, w = (o && o.w) || 1440;
    return function (i) {
      var u = i / N;
      return [960 - w / 2 + u * w, 520 - Math.sin(u * TAU * cyc) * amp];
    };
  }
  function grid(o) {
    var c = (o && o.cols) || 20, r = (o && o.rows) || 12, w = (o && o.w) || 1200, h = (o && o.h) || 640;
    return function (i) {
      var k = i % (c * r), col = k % c, row = (k / c) | 0;
      return [960 - w / 2 + (col + .5) * w / c, 520 - h / 2 + (row + .5) * h / r];
    };
  }
  /* ---- the time tunnel ----------------------------------------------------
     "Oh we can travel … to A.D, to B.C" is not a scatter that slides sideways.
     It is a CORRIDOR. The particles are arranged in depth layers around a lane
     angle, and the force projects them with perspective, so they stream out of
     the vanishing point and past the viewer — and when the direction reverses
     at "To B.C" they fall back away from you instead. The base positions here
     are a set of concentric lanes; `warp` does the projection. */
  function warp(o) {
    var r0 = (o && o.r) || 300, lanes = (o && o.lanes) || 7;
    var per = N / lanes;
    return function (i) {
      var lane = Math.floor(i / per), u = (i % per) / per;
      var a = u * TAU + lane * .35;
      var rr = r0 * (.28 + (lane / lanes) * .72);
      return [960 + Math.cos(a) * rr * 1.7, 500 + Math.sin(a) * rr];
    };
  }
  function sphere(o) {
    var r = (o && o.r) || 300, rings = 13;
    return function (i) {
      var lat = Math.acos(1 - 2 * ((i % (N / rings)) / (N / rings)));
      var lon = (i / (N / rings)) * TAU * 3.1;
      return [960 + r * Math.sin(lat) * Math.cos(lon), 520 + r * Math.cos(lat)];
    };
  }
  /* ---- SHARED SUBJECT GEOMETRY --------------------------------------------
     Each of these subjects is drawn by TWO layers: the field (particles) and
     the vector layer (crisp strokes and solid fills). If each layer keeps its
     own constants they silently disagree — the cross's crossbar floated 80px
     above the solid one, and the dial was an ellipse in the field and a circle
     in the vector, centred 30px apart. So the geometry lives HERE, once, and
     the vector layer asks for it. */
  var DIAL = { cx: 960, cy: 470, R: 300 };

  /* ---------------------------------------------------------------------------
     AM TO PM — where the hand is, and which half of the day it is in.
     ---------------------------------------------------------------------------
     MEASURED, NOT GUESSED. The vocal energy envelope across "From AM to PM"
     (sung from 93.52) has one dominant accent at 94.897 — 0.996 against 0.40 to
     0.62 for every neighbouring frame — and a clear secondary at 94.469. Those
     are the "P" and the "M" of "PM".

     The hand was a free runner (`clock * .11`), so the moment it crossed noon
     had nothing to do with the words, and the two accented syllables landed on
     arbitrary positions of the face. Now the crossing is pinned to 94.90:
     before it the hand is in the AM half (left of the face), after it the PM
     half (right). Both the particle ring and the vector dial read these two
     functions, so the two layers cannot drift apart. */
  var AMPM = {
    t0: 93.52,      /* the line begins            */
    cross: 94.90,   /* the "P" accent = noon      */
    t1: 95.28,      /* the next line takes over   */
    half: 0.24      /* how far into each half the hand travels, in turns */
  };

  /* the hand position as a fraction of a turn; 0 = twelve o'clock.
     Outside the phrase it keeps the original free-running rate. */
  function dialSweep() {
    var t = clock;
    if (t >= AMPM.t0 && t <= AMPM.t1 + .35) {
      var u;
      if (t <= AMPM.cross) {
        /* winding up through the AM half toward noon */
        u = -AMPM.half * (1 - (t - AMPM.t0) / Math.max(.01, AMPM.cross - AMPM.t0));
      } else {
        /* released into the PM half */
        u = AMPM.half * Math.min(1, (t - AMPM.cross) / Math.max(.01, AMPM.t1 - AMPM.cross));
      }
      return u < 0 ? u + 1 : u;         /* the API is 0..1, as before */
    }
    return (t * .11) % 1;
  }

  /* which half of the day the dial is showing:
       1  = AM  (before the 94.90 crossing)
       0  = PM  (after it)
      -1  = not in the AM/PM phrase at all                                  */
  function dialAmPm() {
    var t = clock;
    if (t < AMPM.t0 || t > AMPM.t1 + .35) return -1;
    return t <= AMPM.cross ? 1 : 0;
  }
  var MEMB = { cx: 960, cy: 500, R: 340, K: 7.4, AX: 1.06, AY: .78 };
  /* the power line of the opening, and the insulation that goes over it.
     y 800 puts the cable BELOW the watcher's console (which ends at y 742) —
     at y 540 the cable ran straight through the console text and made it
     unreadable. */
  var PWR = { y: 800, x0: 300, x1: 1660, thick: 30, plugW: 150 };
  var SHEATH = { n: 9, y: 800, w: 104, h: 84, stagger: .18, dur: .50, slide: 760 };
  /* "Oh switch my role" — two bodies that trade places. */
  var ROLE = { cx: 960, cy: 490, gap: 215, s: 380 };
  /* "The trance the trance" — a spiral you fall into. */
  var TRANCE = { cx: 960, cy: 500, R: 380, arms: 3, turns: 3.0 };
  /* 执行 x8 then 死刑 x4 — the execution itself. */
  var GUILL = { cx: 960, top: 300, bot: 880, halfW: 212, bladeH: 96, n: 12 };

  /* deterministic 0..1 hash, for scattering particles inside a shape without
     Math.random (which would make the target set differ on every rebuild) */
  function hash1(n) {
    var x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---- 接上电源 : the power line ------------------------------------------
     "Switch on the power line" opened the song on a bare charging line, which
     says nothing about power. This is a CABLE: a thick run of particles from a
     plug on the left to the far end, and the current arrives at the plug and
     runs down it. `energize` drives the travelling current. */
  function powerLine(o) {
    var rows = 7;
    var per = N / rows;
    return function (i) {
      var r = Math.floor(i / per);
      var u = (i % per) / per;
      var x = PWR.x0 + u * (PWR.x1 - PWR.x0);
      /* a thick cable: rows stacked across its section, so it has body */
      var y = PWR.y + (r - (rows - 1) / 2) * (PWR.thick / rows) * 1.05;
      /* the plug: a block at the left end, the last row's worth of particles */
      if (i % 31 === 0) {
        x = PWR.x0 - 40 + hash1(i) * PWR.plugW;
        y = PWR.y + (hash1(i + 77) - .5) * PWR.thick * 2.1;
      }
      return [x, y];
    };
  }

  /* ---- 绝缘护具 : the insulation ------------------------------------------
     "Remember to put on / PROTECTION" — literally putting the protective gear
     on the line that was just energised. Each plate starts ABOVE the cable and
     drops into place, in sequence, so you watch the gear being fitted. */
  function sheathForm(o) {
    var per = Math.ceil(N / SHEATH.n);
    return function (i) {
      var seg = Math.min(SHEATH.n - 1, Math.floor(i / per));
      var u = (i % per) / per;
      var span = (PWR.x1 - PWR.x0) / (SHEATH.n - 1);
      var cx = PWR.x0 + seg * span;
      /* filled plate: scattered inside the plate's box */
      var px = cx + (hash1(i) - .5) * SHEATH.w;
      var py = (hash1(i + 4093) - .5) * SHEATH.h;
      return [px, PWR.y + py, seg];
    };
  }
  /* where each plate is RIGHT NOW. One function, one source of truth: the
     particle force and the vector layer both read this, so the solid plate and
     its particles can never drift apart (the cross and the dial both taught
     that lesson the hard way).
     The plates slide ALONG the cable rather than dropping from above: gear is
     fitted onto a cable by sliding the sleeve on, and a vertical drop would
     have to fall through the watcher's console. */
  var sheathCache = { t: -1, arr: null };
  function sheathState() {
    if (sheathCache.t === clock && sheathCache.arr) return sheathCache.arr;
    var el = clock - lineClock;
    var span = (PWR.x1 - PWR.x0) / (SHEATH.n - 1);
    var arr = [];
    for (var i = 0; i < SHEATH.n; i++) {
      var start = i * SHEATH.stagger;
      var k = Math.max(0, Math.min(1, (el - start) / SHEATH.dur));
      var e = 1 - Math.pow(1 - k, 3);                 /* ease out: slams home */
      var baseX = PWR.x0 + i * span;
      arr.push({
        x: baseX + (1 - e) * SHEATH.slide, baseX: baseX,
        y: PWR.y, w: SHEATH.w, h: SHEATH.h, p: e,
        /* how long ago it locked, for the locking flash */
        age: el - (start + SHEATH.dur)
      });
    }
    sheathCache = { t: clock, arr: arr };
    return arr;
  }

  /* ---- 切换我的角色 : two bodies that trade places -------------------------
     "Oh switch my role." The old version pushed the left and right halves of a
     RING apart and back — a shape breathing, which says nothing about roles.
     This is two people: one body on the left, another on the right, each
     rendered from a real silhouette. `roleswap` swings them around each other
     so they physically EXCHANGE positions — one over the top, one underneath —
     which is what switching roles looks like. */
  function twoBodies(nameA, nameB) {
    var half = Math.floor(N / 2);
    var fA = artForm(nameA, { to: { x: ROLE.cx - ROLE.gap, y: ROLE.cy, s: ROLE.s } });
    var fB = artForm(nameB, { to: { x: ROLE.cx + ROLE.gap, y: ROLE.cy, s: ROLE.s } });
    /* the third slot carries which body this particle belongs to, because the
       force has to rotate each body as a RIGID unit — rotating them by particle
       index would smear them into each other */
    return function (i) {
      if (i < half) { var a = fA(i); return [a[0], a[1], 0]; }
      var b = fB(i - half); return [b[0], b[1], 1];
    };
  }

  /* ---- PARTICLE EXCHANGE ---------------------------------------------------
     "Switch my gender" / "To S to M" used to be a cross-fade between two
     silhouettes: two pictures dissolving into each other, plus a solid vector
     silhouette on top of them. That reads as graphical swapping, and it is
     abrupt because nothing actually travels — the eye sees one image replaced
     by another.

     This makes the MATTER move instead. The cloud is split in two; the first
     half starts as one figure on the left, the second half as the other figure
     on the right, and the two target sets are built so that each group ends up
     on the OPPOSITE side wearing the OPPOSITE shape. Morphing between them
     therefore sends every particle across the middle and through the other
     body, changing figure on the way — a real exchange of substance rather than
     a dissolve.

     `firstHalfGoesRight` is what makes the two sets complementary: set A and
     set B are the same construction with the groups' destinations flipped. */
  function exchangeSet(nameFirst, nameSecond, firstHalfGoesRight) {
    var half = Math.floor(N / 2);
    var L = { x: ROLE.cx - ROLE.gap, y: ROLE.cy, s: ROLE.s };
    var R = { x: ROLE.cx + ROLE.gap, y: ROLE.cy, s: ROLE.s };
    var f1 = artForm(nameFirst,  { to: firstHalfGoesRight ? R : L });
    var f2 = artForm(nameSecond, { to: firstHalfGoesRight ? L : R });
    return function (i) {
      if (i < half) { var a = f1(i); return [a[0], a[1], 0]; }
      var b = f2(i - half); return [b[0], b[1], 1];
    };
  }

  /* ---- 恍惚出神 : the spiral ----------------------------------------------
     "So we can enter / The trance." A spiral is the hypnotic image, and — more
     importantly — it is NOT a circle, so it does not read as the generic ring
     that every other beat was using. Each particle's position along the spiral
     (0 at the rim, 1 at the centre) is carried in the third slot, which lets
     `hypnosis` flow particles INWARD along it. */
  function spiralForm(o) {
    var arms = TRANCE.arms, turns = TRANCE.turns, R = TRANCE.R;
    var per = N / arms;
    return function (i) {
      var arm = Math.floor(i / per) % arms;
      var t = (i % per) / per;                    /* 0 rim … 1 centre */
      var a = arm * TAU / arms + t * turns * TAU;
      var rr = R * (1 - t) * (1 + (i % 7) * .012);
      return [TRANCE.cx + Math.cos(a) * rr, TRANCE.cy + Math.sin(a) * rr * .80,
              arm + t];                            /* integer part = the arm */
    };
  }

  /* ---- 执行 / 死刑 : the guillotine --------------------------------------
     Twelve chants, escalating, then the sentence. The field was a sphere that
     shattered and went red — a firework, which is what a celebration looks
     like, not what an execution looks like. This is the instrument itself: an
     upright frame with a blade that is WINCHED UP over twelve rungs and then
     DROPPED once. The blade is the point: the whole section is one machine
     being raised, and the drop is the sentence. */
  function guillotineForm(o) {
    var left = GUILL.cx - GUILL.halfW, right = GUILL.cx + GUILL.halfW;
    var top = GUILL.top, bot = GUILL.bot;
    var bladeY = top + 54;                       /* where the blade parks */
    var per = N / 3;
    return function (i) {
      var part = Math.floor(i / per);            /* 0 left post, 1 right, 2 blade */
      var u = (i % per) / per;
      if (part < 2) {
        /* the two uprights: a frame, filled as a thick column */
        var px = (part ? right : left) + (hash1(i) - .5) * 26;
        var py = top + u * (bot - top);
        return [px, py, 0];
      }
      /* the blade: a heavy trapezoid hanging in the frame, plus its rope */
      if (u < .16) {
        /* the rope, up to the top beam */
        return [GUILL.cx + (hash1(i) - .5) * 8, top - 60 + (u / .16) * (bladeY - top + 60), 2];
      }
      var v = (u - .16) / .84;
      var w = GUILL.halfW * (0.30 + v * 0.62);   /* the blade's wedge */
      var by = bladeY + v * GUILL.bladeH;
      return [GUILL.cx + (hash1(i + 91) - .5) * w * 2, by, 1];
    };
  }

  /* ---- a circular MEMBRANE -------------------------------------------------
     "If I can feel your vibrations." A drum skin, not a ripple: particles fill
     a disc in concentric rings, which is how the standing waves of a real
     circular membrane actually look (its nodes are circles and diameters). The
     force then makes the skin resonate. Filling it as a disc — rather than a
     ring outline — is what lets the wave pattern be seen at all. */
  function membrane(o) {
    var rings = 15;
    var per = N / rings;
    return function (i) {
      var ring = (i / per) | 0;
      var u = (i % per) / per;
      var rr = MEMB.R * (ring / (rings - 1));   /* centre r=0, rim r=R */
      var a = u * TAU + ring * 1.7;             /* stagger, so it is not spokes */
      return [MEMB.cx + Math.cos(a) * rr * MEMB.AX,
              MEMB.cy + Math.sin(a) * rr * MEMB.AY];
    };
  }
  /* the dial's dust: THREE concentric rings ACROSS the face (not one ring just
     outside the rim, which read as a detached halo), so the rotating dust fills
     the dial and the hand has something to sweep through at every radius */
  function dialDust(o) {
    return function (i) {
      var a = (i / N) * TAU * 3;
      var band = i % 3;
      var rr = DIAL.R * (band === 0 ? .46 : band === 1 ? .72 : .97)
             * (1 + ((i / 3) % 5) * .012);
      return [DIAL.cx + Math.cos(a) * rr, DIAL.cy + Math.sin(a) * rr];
    };
  }
  function cube(o) {
    var s = (o && o.r) || 280;
    var v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    var e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    return function (i) {
      var k = i % (e.length * 40), ei = (k / 40) | 0, u = (k % 40) / 40;
      var a = v[e[ei][0]], b = v[e[ei][1]];
      var x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u;
      var sc = 1 / (1 + z * .22);
      return [960 + x * s * sc, 520 + y * s * sc];
    };
  }
  function axis(o) {
    var span = (o && o.span) || 700;
    return function (i) {
      var k = i % 3, t = ((i / 3) | 0) / (N / 3) - .5;
      if (k === 0) return [960 + t * span, 520];
      if (k === 1) return [960 + t * span, 520 + rnd(-4, 4)];
      var x = t < 0 ? 960 - span / 2 : 960 + span / 2;
      return [x, 520 + ((i % 13) - 6) * span / 120];
    };
  }
  /* implicit shapes, sampled by jittered-grid rejection */
  var INSIDE = {
    /* normalised heart: the classic implicit curve is fat at +v and pinched at
       -v, and +v is DOWN on screen — so flip v or the heart renders upside down. */
    heart: function (u, v) {
      v = -v;
      var a = u * u + v * v - 1;
      return a * a * a - u * u * v * v * v < 0;
    },
    eggplant: function (x, y) {
      var u = (x + 12) / 24, v = y / 34;
      if (u * u + v * v < 1) return true;
      return Math.abs(x + 2) < 15 && Math.abs(y + 38) < 10;
    },
    tomato: function (x, y) {
      var u = x / 30, v = y / 26;
      if (u * u + v * v < 1) return true;
      return Math.abs(x) < 18 && y > -36 && y < -18;
    },
    cat: function (x, y) {
      if (y > -30 && y < 6 && x > -26 && x < 12) return true;                  /* seated body */
      var hx = x - 26, hy = y + 28;                                            /* head, clear of the body */
      if (hx * hx + hy * hy < 90) return true;
      if (y < -34 && y > -50 && Math.abs(x - 20) < 7) return true;             /* ear */
      if (y < -34 && y > -50 && Math.abs(x - 32) < 7) return true;             /* ear */
      var dx = x + 34, dy = y - 8;                                             /* tail curl */
      return Math.abs(Math.sqrt(dx * dx + dy * dy) - 26) < 4.5 && y > -14;
    },
    cage: function (x, y) {
      var w = 250, h = 210;
      if (Math.abs(Math.abs(x) - w) < 5 && Math.abs(y) < h) return true;
      if (Math.abs(Math.abs(y) - h) < 5 && Math.abs(x) < w) return true;
      if (Math.abs(x % 62) < 4 && Math.abs(y) < h - 6) return true;
      return false;
    },
    genders: function (x, y) {
      var dx = x + 150, dy = y;
      if (Math.abs(Math.sqrt(dx * dx + dy * dy) - 62) < 5) return true;        /* female ring */
      if (Math.abs(dx) < 5 && dy > 60 && dy < 120) return true;
      if (Math.abs(dy - 96) < 5 && Math.abs(dx) < 30) return true;
      var ex = x - 160, ey = y;
      if (Math.abs(Math.sqrt(ex * ex + ey * ey) - 58) < 5) return true;        /* male ring */
      return Math.abs(ex - ey) < 5 && ex > 30 && ex < 108;
    },
    /* ---- the two glyphs that take turns during the identity swap ---------- */
    female: function (x, y) {
      /* ♀ : ring, stem below, crossbar */
      if (Math.abs(Math.sqrt(x * x + (y + 40) * (y + 40)) - 74) < 8) return true;
      if (Math.abs(x) < 8 && y > 24 && y < 150) return true;
      if (Math.abs(y - 108) < 8 && Math.abs(x) < 44) return true;
      return false;
    },
    male: function (x, y) {
      /* ♂ : ring, then an arrow to the upper right */
      if (Math.abs(Math.sqrt(x * x + (y + 20) * (y + 20)) - 70) < 8) return true;
      if (Math.abs((y + 20) + (x) ) < 9 && x > 46 && x < 150) return true;
      var hx = x - 136, hy = y + 156;                                        /* arrowhead */
      return Math.abs(hx) + Math.abs(hy) < 38 && x > 104;
    },
    /* ---- crown and sword, for "To S, to M" -------------------------------- */
    crown: function (x, y) {
      if (Math.abs(y - 40) < 10 && Math.abs(x) < 150) return true;           /* band */
      if (x < -90 && y > -80 && y < 40 && Math.abs(x + 90 + (40 - y) * .5) < 9) return true;
      if (Math.abs(x) < 9 && y > -70 && y < 40) return true;
      if (x > 90 && y > -80 && y < 40 && Math.abs(x - 90 + (40 - y) * .5) < 9) return true;
      if (Math.abs(x + 40) < 9 && y > -26 && y < 40) return true;
      if (Math.abs(x - 40) < 9 && y > -26 && y < 40) return true;
      return false;
    },
    sword: function (x, y) {
      if (Math.abs(y - 60) < 8 && Math.abs(x) < 120) return true;            /* guard */
      if (Math.abs(x) < 7 && y > 60 && y < 130) return true;                 /* grip */
      /* blade, angled up-left */
      var t = (x + 40) + (y + 60);
      return Math.abs(t) < 8 && y < 56 && y > -150 && x < 40 && x > -160;
    }
  };
  /* Silhouettes. Each INSIDE fn works in its OWN units, so we walk that box on a
     fine grid, keep every cell that is inside, and hand the resulting POOL out to
     the particles. (Sampling with a golden-angle spiral put every point on a
     spiral arm — an eggplant came out as a spirograph flower.) */
  var poolCache = {};
  function shape(name, x0, x1, y0, y1, scale) {
    var key = name + '|' + scale;
    var pool = poolCache[key];
    if (!pool) {
      pool = poolCache[key] = [];
      var f = INSIDE[name], NX = 96, NY = 96;
      for (var iy = 0; iy < NY; iy++) {
        for (var ix = 0; ix < NX; ix++) {
          var u = x0 + (ix + .5) * (x1 - x0) / NX;
          var v = y0 + (iy + .5) * (y1 - y0) / NY;
          if (f(u, v)) pool.push([960 + u * scale, 520 + v * scale]);
        }
      }
      /* deterministic shuffle so the morph sweep does not read as scanlines */
      for (var s = pool.length - 1; s > 0; s--) {
        var j = (s * 7919) % (s + 1), tmp = pool[s];
        pool[s] = pool[j]; pool[j] = tmp;
      }
    }
    return function (i) { return pool.length ? pool[(i * 13) % pool.length] : [960, 520]; };
  }
  /* text + formula sampling, cached per string */
  var textCache = {};
  function text(o) {
    var s = (o && o.s) || 'me', size = (o && o.size) || 120;
    var key = s + '|' + size;
    var pts = textCache[key];
    if (!pts) {
      if (!off) { off = document.createElement('canvas'); off.width = W; off.height = H; octx = off.getContext('2d'); }
      octx.clearRect(0, 0, W, H);
      octx.fillStyle = '#fff';
      octx.font = '300 ' + size + 'px "Helvetica Neue", "Segoe UI", Roboto, sans-serif';
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText(s, 960, 520);
      var d = octx.getImageData(0, 0, W, H).data, pts2 = [];
      for (var y = 0; y < H; y += 3) for (var x = 0; x < W; x += 3) {
        if (d[(y * W + x) * 4 + 3] > 140) pts2.push([x, y]);
      }
      pts = textCache[key] = pts2;
    }
    return function (i) {
      if (!pts.length) return [960, 520];
      var p = pts[(i * 7) % pts.length];
      return [p[0], p[1]];
    };
  }
  /* ---- the ledger: a growing library of what it has learned ----------------
     Rows of writing, stacked. Each "I've studied" banks one more row and the
     stack grows; then the rows lift off and orbit (held in mind); then each
     question lands a hit; then the whole library resolves into one expression. */
  function ledger(o) {
    var rows = Math.max(1, (o && o.rows) || 1);
    var y0 = (o && o.y) || 300;
    var per = Math.floor(N / 6);
    return function (i) {
      var row = Math.min(rows - 1, (i / per) | 0);
      var u = (i % per) / per;                 /* position along the row */
      var x = -520 + u * 1040;
      var y = y0 + row * 44 - (rows - 1) * 22;
      /* the writing is not uniform: it clusters into words */
      var word = Math.floor(u * 9);
      var seed = (row * 37 + word * 11) % 13;
      x += Math.sin(seed) * 6;
      /* letters have gaps; every 11th slot is thin */
      return [960 + x, 520 + y + (seed % 3) * 1.5];
    };
  }

  /* ---- text as a SHAPE ---------------------------------------------------
     The boot beats spell the title. `text` was referenced by the score but
     never defined, so those four beats silently fell back to FORM.scatter and
     the title never appeared in the field at all. This rasterises the string
     into the same pixel pool the nouns use, so the letters are made of the
     same particles — typed, not overlaid. */
  var textCache = {};
  function textPool(s, size) {
    var key = s + '|' + size;
    if (textCache[key]) return textCache[key];
    var pad = 40;
    var c = document.createElement('canvas');
    c.width = 1600; c.height = 400;
    var g = c.getContext('2d');
    g.font = '700 ' + size + 'px "Cascadia Mono", Consolas, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(s, c.width / 2, c.height / 2);
    var d = g.getImageData(0, 0, c.width, c.height).data;
    var pool = [];
    for (var y = 0; y < c.height; y += 2)
      for (var x = 0; x < c.width; x += 2)
        if (d[(y * c.width + x) * 4 + 3] > 128) pool.push([x, y]);
    for (var q = pool.length - 1; q > 0; q--) {
      var j = (q * 7919) % (q + 1), tt = pool[q]; pool[q] = pool[j]; pool[j] = tt;
    }
    textCache[key] = pool;
    return pool;
  }
  function textForm(k) {
    var s = (k && k.s) || 'world.execute(me);';
    var size = (k && k.size) || 96;
    var pool = textPool(s, size);
    var to = { x: 960, y: 500 };
    if (!pool.length) return function () { return [to.x, to.y]; };
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i][0] < minx) minx = pool[i][0];
      if (pool[i][0] > maxx) maxx = pool[i][0];
      if (pool[i][1] < miny) miny = pool[i][1];
      if (pool[i][1] > maxy) maxy = pool[i][1];
    }
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    return function (i) {
      var p = pool[(i * 13) % pool.length];
      return [to.x + (p[0] - cx), to.y + (p[1] - cy)];
    };
  }

  var FORM = {
    scatter: scatter, line: line, ring: ring, arc: arc, sine: sine, grid: grid,
    sphere: sphere, cube: cube, axis: axisForm, ledger: ledger, warp: warp,
    text: textForm, membrane: membrane, dial: dialDust,
    powerLine: powerLine, sheath: sheathForm,
    roles: function () { return twoBodies('femaleFig', 'maleFig'); },
    rolesSM: function () { return twoBodies('domFig', 'subFig'); },
    /* the two complementary target sets of a particle exchange. Morphing A→B
       sends every particle across the middle into the other figure; see
       exchangeSet() above. */
    swapGenderA: function () { return exchangeSet('femaleFig', 'maleFig', false); },
    swapGenderB: function () { return exchangeSet('maleFig', 'femaleFig', true); },
    swapSMA:     function () { return exchangeSet('domFig', 'subFig', false); },
    swapSMB:     function () { return exchangeSet('subFig', 'domFig', true); },
    spiral: spiralForm,
    guillotine: guillotineForm,
    /* parametric curve forms: one curve whose params change, so the figure
       flows instead of swapping. */
    cTrain:   function (k) { return function (i) { return CURVE.trainPoint((i + .5) / N, k || {}); }; },
    cSine:    function (k) { return function (i) { return CURVE.sine((i + .5) / N, k || {}); }; },
    cCircle:  function (k) { return function (i) { return CURVE.circle((i + .5) / N, k || {}); }; },
    cRoll:    function (k) { return function (i) { return CURVE.roll((i + .5) / N, k || {}); }; },
    cBounded: function (k) { return function (i) { return CURVE.bounded((i + .5) / N, k || {}); }; },
    cWire:    function (k) { return function (i) { return CURVE.wire((i + .5) / N, k || {}); }; },
    /* two glyphs for the identity swap, present at the same time */
    female: function () { return shape('female', -1, 1, -1, 1, 320); },
    male: function () { return shape('male', -1, 1, -1, 1, 320); },
    crown: function () { return shape('crown', -1, 1, -1, 1, 320); },
    sword: function () { return shape('sword', -1, 1, -1, 1, 320); },
    /* v1-style rasterised nouns: the SAME particles flow into these */
    aEggplant: function (k) { return artForm('eggplant', k); },
    aTomato:   function (k) { return artForm('tomato', k); },
    aGlass:    function (k) { return artForm('glass', k); },
    aCat:      function (k) { return artForm('cat', k); },
    aHeart:    function (k) { return artForm('heart', k); },
    aHeartPiece: function (k) { return heartPieceForm(k); },
    /* the emergence: the last beat of the song */
    emergeSeed: function (k) { return emergeCore(k); },
    emergeRise: function (k) { return emergeRise(k); },
    aCrown:    function (k) { return artForm('crown', k); },
    aSword:    function (k) { return artForm('sword', k); },
    /* the cross, and its two beams separately so the crossbar can LAND on the
       upright during "you are the proof of my existence" */
    aCross:     function (k) { return artForm('cross', k); },
    aCrossPost: function (k) { return artForm('crossPost', k); },
    /* silhouettes, so the identity swap reads as bodies not symbols */
    aFemale:   function (k) { return artForm('femaleFig', k); },
    aMale:     function (k) { return artForm('maleFig', k); },
    aDom:      function (k) { return artForm('domFig', k); },
    aSub:      function (k) { return artForm('subFig', k); },
    /* the four letters of LO-O-OVE, one per shot */
    aL:        function (k) { return artForm('letL', k); },
    aO:        function (k) { return artForm('letO', k); },
    aV:        function (k) { return artForm('letV', k); },
    aE:        function (k) { return artForm('letE', k); },
    /* keep the old silhouette names working */
    eggplant: function (k) { return artForm('eggplant', k); },
    tomato: function (k) { return artForm('tomato', k); },
    cat: function (k) { return artForm('cat', k); },
    heart: function (k) { return artForm('heart', k); },
    cage: function () { return shape('cage', -262, 262, -222, 222, 1.0); }
  };

  /* ---- the six countries -------------------------------------------------
     "EIN / DOS / TROIS / NE / FEM / LIU" — the song counts to six in six
     languages, so each beat becomes that country's SILHOUETTE. The outlines are
     real (assets/pv-geo.js, generated from world.geo.json by _pv/mkgeo.js), and
     the SHAPE + FORM entries are generated here so adding a country means
     regenerating that file, not editing this one. */
  var GEO = (root.PVGEO || {});
  /* The box the countries are fitted into. y 580 rather than the art default of
     510 because the big word (EIN / DOS / TROIS …) is a headline at y 236..350
     and the silhouette must sit under it, not behind it. GEOBOX is the ONE
     definition: the form and the vector layer's geoGeom both read it, so the
     border can never be fitted to a different box than the fill. */
  var GEOBOX = { x: 960, y: 580, s: 440 };
  Object.keys(GEO).forEach(function (cc) {
    /* ALL rings are drawn, not just the mainland. China is mainland + Taiwan +
       Hainan; drawing only the biggest ring left a province off the map. */
    SHAPE['geo' + cc] = function (g, w, h) {
      var rings = GEO[cc].rings || [];
      g.fillStyle = '#fff';
      g.beginPath();
      for (var r = 0; r < rings.length; r++) {
        var pts = rings[r];
        for (var i = 0; i < pts.length; i++) {
          var x = pts[i][0] * w, y = pts[i][1] * h;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.closePath();
      }
      g.fill();
    };
    FORM['aGeo' + cc] = function (k) { return geoForm(cc, k); };
  });

  /* like heartPieceForm, this RANKS the pixels by angle around the shape's
     centroid and hands the rank back as the third element. The `territory`
     force then sweeps that rank, so the country is DRAWN ON rather than simply
     switching on — which matters because these beats are only ~0.4s each. */
  function geoForm(cc, k) {
    var to = (k && k.to) || GEOBOX;
    var pool = rasterPool('geo' + cc, 260, 260, 2);
    if (!pool.length) return function () { return [to.x, to.y]; };
    var g = artGeomFor('geo' + cc, to);
    var hcx = 0, hcy = 0;
    for (var q = 0; q < pool.length; q++) { hcx += pool[q][0]; hcy += pool[q][1]; }
    hcx /= pool.length; hcy /= pool.length;
    var order = pool.map(function (p, idx) {
      return [Math.atan2(p[1] - hcy, p[0] - hcx), idx];
    }).sort(function (a, b) { return a[0] - b[0]; });
    var rankOf = new Array(pool.length);
    for (var r = 0; r < order.length; r++) rankOf[order[r][1]] = r / order.length;
    return function (i) {
      var pi = (i * 13) % pool.length, p = pool[pi];
      return [to.x + (p[0] - g.cx) * g.sc, to.y + (p[1] - g.cy) * g.sc, rankOf[pi]];
    };
  }

  /* ----------------------------------------------------------- the forces */
  /* Every force gets `o.quiet` first: when a beat is carried by CHARACTER ART
     the field must get out of the way instead of spraying a dot cloud behind
     the words. quiet 1 = almost nothing, 0 = full presence. */
  function quietFade(p, o) {
    if (!o.quiet) return true;
    /* keep only every ~12th particle, and faintly */
    if ((p.i % 12) !== 0) { p.fade = 0; return false; }
    p.fade *= (1 - o.quiet * .55);
    return true;
  }

  var F = {
    drift: function (p, i, o) { p.ox += Math.sin(o.clock * .6 + i * .11) * 14; p.oy += Math.cos(o.clock * .5 + i * .07) * 12; },

    /* ---- the insurrection: a process trying to seize the system ----------
       Not a circle. It keeps surging outward to take control and keeps being
       killed back down; each refused command in the terminal is one failed
       surge. The grid form makes it read as a system, not a shape.

       ONE function for the whole section, driven by K.n (the command counter).
       It used to be three separate forces — rise / revolt / denied — swapped at
       each beat, and because the field swaps its force instantly that made the
       section read as three hard cuts. Now nothing swaps: the same surge just
       gets faster, wider and more desperate as n climbs from 1 to 6, and the
       snap-back after each peak gets harder. The escalation is continuous, so
       the section has one rising arc instead of three blocks. */
    insurge: function (p, i, o) {
      var n = Math.max(0, (K.n || 1) - 1);            /* 0 … 5 */
      var prog = n / 5;                               /* 0 … 1  escalation */
      var rate = .42 + prog * .76;                    /* surges come faster */
      var period = 1.65 - prog * .52;                 /* and closer together */
      var amp = 20 + prog * 26;                       /* and reach further */
      var cx = 960, cy = 520;
      var dx = p.tx - cx, dy = p.ty - cy;
      var d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var r = d / 760;
      var t = (o.clock * rate) % period;
      var head = t / period;                          /* 0..1 sawtooth of a surge */
      /* the wavefront: a bright ring travelling outward from the centre */
      var near = Math.max(0, 1 - Math.abs(r - head) * (2.5 + prog * .8));
      /* the refusal: after the wavefront peaks it is slammed back inward */
      var snap = Math.max(0, 1 - Math.abs(r - head + .22) * (4.5 + prog * 1.5));
      p.lit = .16 + .84 * near;
      p.fade = .28 + .72 * near;
      /* outward push on the crest, inward shove just behind it */
      p.ox += dx / d * near * amp;
      p.oy += dy / d * near * amp;
      p.ox -= dx / d * snap * (amp * .55);
      p.oy -= dy / d * snap * (amp * .55);
      /* every refused command lands as a shock through the whole process, and
         the harder it tries the more of the process is pinned at the centre */
      var beat = Math.pow(Math.max(0, Math.sin(o.clock * (3.4 + prog * 3.4))), 8);
      p.ox += dx / d * beat * (14 + prog * 16);
      p.oy += dy / d * beat * (14 + prog * 16);
      p.ox -= dx * (.05 + prog * .07);
      p.oy -= dy * (.05 + prog * .07);
      p.lit = Math.max(p.lit, .22 + .55 * beat);
    },

    /* ---- 接上电源 : the current arrives -----------------------------------
       "Switch on the power line." The plug is connected and the current runs
       down the cable: a bright head travels from the plug to the far end, and
       the cable behind it is live while everything ahead of it is dead. Before
       the first contact the head stutters, because a plug sparking on is not a
       clean event. */
    energize: function (p, i, o) {
      var u = (p.tx - PWR.x0) / Math.max(1, PWR.x1 - PWR.x0);
      /* the stutter: the current only settles into a steady run after ~0.5s */
      var settle = Math.min(1, o.local / .55);
      var jitter = (1 - settle) * Math.sin(o.clock * 37 + i * 1.7) * .05;
      var run = (o.clock * .42 + jitter) % 1.25;      /* head travels the cable */
      var live = u < run;
      var head = Math.max(0, 1 - Math.abs(u - run) * 5.5);
      p.lit = live ? .46 + .54 * head : .12;
      p.fade = live ? .72 + .28 * head : .30;
      /* the live section hums: a standing tremor through the conductor */
      if (live) {
        p.oy += Math.sin(o.clock * 26 + i * .9) * (2.2 + head * 5);
        p.ox += Math.sin(o.clock * 19 + i * 1.3) * 1.6;
      }
      /* the plug arcing on: a burst of light at the left end while it settles */
      if (u < .06 && settle < 1) {
        var spark = (1 - settle) * Math.abs(Math.sin(o.clock * 44 + i));
        p.lit = Math.min(1, p.lit + spark * .8);
        p.ox += (hash1(i) - .5) * spark * 26;
        p.oy += (hash1(i + 13) - .5) * spark * 26;
      }
    },

    /* ---- 绝缘护具 : the insulation goes on --------------------------------
       "Remember to put on / PROTECTION." The plates drop onto the cable one
       after another and clamp. Once a plate has landed its particles go quiet
       and bright — the point of protective gear is that it stops moving — and
       the cable underneath goes dark, because it is now covered. */
    sheathe: function (p, i, o) {
      var seg = (p.wedge == null) ? 0 : p.wedge;
      var st = sheathState()[seg];
      /* the plate's current x IS the slide; p.tx is where it finally sits */
      p.ox += (st.x - st.baseX);
      var landed = st.p >= .999;
      if (landed) {
        /* locked: still and solid — the point of protective gear is that it
           stops moving */
        p.lit = .82;
        p.fade = 1;
        /* the locking flash, decaying from the moment it seated */
        if (st.age >= 0 && st.age < .28) {
          var f = 1 - st.age / .28;
          p.lit = 1;
          p.ox += f * 9;
          p.oy += (hash1(i) - .5) * f * 16;
        }
      } else {
        p.lit = .30 + .50 * st.p;
        p.fade = .34 + .66 * st.p;
        /* still sliding: a slight lag on the trailing edge, so it is a plate
           and not a rigid card */
        p.oy += (1 - st.p) * Math.sin(o.clock * 9 + i * .4) * 6;
      }
    },

    /* ---- the six countries -------------------------------------------------
       "One / two / three / four / five / six", each in another language, so
       each beat draws that country. The beats are only ~0.4s, so the outline is
       SWEPT on by rank rather than faded in: a bright border runs around the
       shape and the interior fills behind it, which reads as a map being drawn
       even at this speed. Once drawn, the whole silhouette is held steady — the
       country is simply there. */
    territory: function (p, i, o) {
      var rank = (p.wedge == null) ? 0 : p.wedge;
      var dur = (K.dur == null) ? .36 : K.dur;
      var k = Math.min(1, o.local / dur);
      var on = rank <= k;
      /* the drawn part: bright and solid. The undrawn part still shows faintly
         as an outline, so the shape is legible from the first frame. */
      p.lit = on ? .92 : .13;
      p.fade = on ? 1 : .26;
      /* the travelling border: a hot edge at the sweep front */
      var head = Math.max(0, 1 - Math.abs(rank - k) * 26);
      if (head > 0) {
        p.lit = 1;
        p.ox += Math.cos(o.clock * 9 + i) * head * 3;
        p.oy += Math.sin(o.clock * 9 + i) * head * 3;
      }
      /* settled: the machine keeps SCANNING the territory. A band travels down
         the shape and everything inside it is displaced, so a held country is
         never a frozen image. A machine cataloguing nations by running a scan
         over them is also just the right idea for this song. (Measured: with
         only a slow breathing the settled shape was 0.0px/frame — completely
         static, which is the complaint this whole section keeps running into.) */
      if (k >= 1) {
        var y0 = GEOBOX.y - GEOBOX.s * .5, y1 = GEOBOX.y + GEOBOX.s * .5;
        var span = Math.max(1, y1 - y0);
        var scan = (o.clock * .62) % 1.35;         /* crosses, then a short gap */
        var d = Math.abs((p.ty - y0) / span - scan);
        var near = Math.max(0, 1 - d * 7);
        p.lit = Math.min(1, .60 + .40 * near + .12 * Math.sin(o.clock * 1.4 + rank * 9));
        /* FREQUENCIES MUST STAY LOW. The integrator is a damped spring
           (vx = (vx + dx*.105)*.78), which filters fast oscillation away: a
           2.4Hz carrier came out as 0.1px/frame. Everything here is below
           ~0.7Hz, where the spring can actually follow it. */
        p.oy += near * 24 * Math.sin(o.clock * 4.2 + i * .5);
        p.ox += near * 11 * Math.cos(o.clock * 3.4 + i * .4);
        /* a slow swell through the whole territory, so no part of a held
           country is ever perfectly still */
        p.ox += Math.sin(o.clock * 2.8 + p.ty * .012) * 13;
        p.oy += Math.cos(o.clock * 2.5 + p.tx * .010) * 13;
      }
    },

    /* ---- 切换我的角色 : the two bodies trade places ------------------------
       "Oh switch my role." One body on the left, one on the right, and they
       physically EXCHANGE positions — one swings over the top while the other
       passes underneath. That is what switching roles looks like; the old
       version pushed two halves of a ring apart, which is a shape breathing.
       Each body is moved as a RIGID unit (its own centre is rotated about the
       midpoint), because rotating them per-particle would smear them into each
       other instead of swapping them. */
    /* ---- PARTICLE EXCHANGE (the force) --------------------------------------
       The form pair swapGenderA/B already makes every particle travel to the
       other figure's place. This adds the physics of the crossing, which is what
       keeps it from reading as two groups sliding past each other:

         * the two groups LIFT as they pass, one over and one under, because two
           bodies cannot occupy the same point at the same time — without this
           they intersect and the frame turns to mush
         * they brighten at the middle, so the moment of changing figure is the
           brightest part of the beat
         * a drag trail on the leading edge makes the direction of travel read

       `p.wedge` is the group (0 = the left body, 1 = the right one), which the
       exchangeSet forms write. */
    exchange: function (p, i, o) {
      var side = (p.wedge == null) ? 0 : p.wedge;
      var t = o.local;
      /* how far through the crossing this particle is: it starts at its own
         side and ends at the other, so the midpoint of the beat is when the two
         groups are on top of each other */
      var u = (o.clock - lineClock);
      var span = (K.period == null ? 2.4 : K.period);
      var ph = Math.abs(Math.sin(u * Math.PI / Math.max(.4, span)));
      /* the vertical separation peaks exactly at the crossing */
      var lift = ph * (side ? -1 : 1) * 92;
      p.oy += lift;
      /* brightness follows the crossing: both groups flare as they overlap */
      p.lit = Math.max(p.lit, .40 + .60 * ph);
      p.fade = Math.min(1, p.fade + .45 * ph);
      /* a trail pointing the way they are going: the left group travels right
         and vice versa, so the offset is opposite for the two groups */
      p.ox += (side ? -1 : 1) * ph * 30;
    },

    roleswap: function (p, i, o) {
      var side = (p.wedge == null) ? 0 : p.wedge;
      var t = clock - lineClock;
      var k = (1 - Math.cos(Math.min(1, t / 2.4) * Math.PI)) / 2;   /* 0→1→settle */
      var mid = ROLE.cy;
      var bodyY = ROLE.cy;
      var a = k * Math.PI;                       /* half a turn */
      /* each body orbits the midpoint; the sign of the angle is what sends one
         over and the other under */
      var dir = side ? 1 : -1;
      var dx = 0, dy = bodyY - mid;              /* both start level */
      var c = Math.cos(a * dir), s = Math.sin(a * dir);
      var rx = dx * c - dy * s;
      var ry = dx * s + dy * c;
      p.ox += rx - dx;
      p.oy += ry - dy;
      /* and they cross through the middle, so they must pass each other: the
         one going over is lifted, the one going under is dropped */
      var lift = Math.sin(a) * (side ? -1 : 1) * ROLE.gap * .62;
      p.oy += lift;
      /* during the swap they are tense; after it they settle */
      var busy = Math.sin(Math.min(1, t / 2.4) * Math.PI);
      p.lit = .46 + .54 * busy;
      p.fade = .62 + .38 * busy;
      /* a slight trail behind each body while it is moving fast */
      p.ox -= Math.cos(a * dir) * busy * 14 * (side ? 1 : -1);
    },

    /* ---- 恍惚出神 : the spiral pulls you in --------------------------------
       "So we can enter / The trance the trance." A spiral, not a ring — every
       other beat was using circles and this one has to look like falling
       inward. The third slot carries each particle's place along the spiral
       (arm + t), so the flow can run from the rim to the centre and then
       restart, which is the hypnotic loop the lyric describes. */
    hypnosis: function (p, i, o) {
      var slot = (p.wedge == null) ? 0 : p.wedge;
      var arm = Math.floor(slot);
      var u0 = slot - arm;                        /* 0 rim … 1 centre */
      var t = clock - lineClock;
      /* the flow: everything slides toward the centre and is reborn at the rim.
         Driven by the CLOCK, not by stored per-particle state, so a seek lands
         in the right place instead of resetting to the rim. */
      var flow = (t * .30) % 1;
      var u = (u0 + flow) % 1;
      var a = arm * TAU / TRANCE.arms + u * TRANCE.turns * TAU + t * .25;
      var rr = TRANCE.R * (1 - u);
      var tx = TRANCE.cx + Math.cos(a) * rr;
      var ty = TRANCE.cy + Math.sin(a) * rr * .80;
      p.ox += tx - p.tx;
      p.oy += ty - p.ty;
      /* the centre is the brightest and most compressed point — the eye of the
         trance — and the rim fades out, so the spiral reads as depth */
      p.lit = .24 + .76 * u;
      p.fade = .30 + .70 * u;
      /* a shimmer running down the arms */
      p.lit = Math.min(1, p.lit + .22 * Math.sin(t * 3 + u * 9 + arm * 2));
      /* and the whole thing breathes, so it is never a still picture */
      p.ox += Math.sin(t * .9 + i * .02) * 9;
      p.oy += Math.cos(t * .8 + i * .018) * 7;
    },

    /* ---- 执行 x12, then the drop ------------------------------------------
       `K.n` is the rung 1..12. The blade is WINCHED UP one notch per chant and
       ratchets (it never slips back), and at rung 12 the sentence is carried
       out: the blade falls, and the frame rings. Escalation you can watch,
       instead of a sphere that shatters twelve times. */
    raise: function (p, i, o) {
      var part = (p.wedge == null) ? 0 : p.wedge;
      var n = (K.n == null) ? 1 : K.n;
      var prog = Math.min(1, n / GUILL.n);          /* 0 → 1 over the twelve */
      var t = clock - lineClock;
      /* the drop happens once, at the twelfth */
      var dropping = (n >= GUILL.n);
      var drop = dropping ? Math.min(1, t / .34) : 0;
      var dropEase = drop * drop;                    /* accelerating, like a fall */
      var fall = dropEase * (GUILL.bot - GUILL.top - GUILL.bladeH - 54);

      /* the winch: between chants the blade creeps up another notch */
      var creep = Math.sin(t * 9) * (1 - Math.min(1, t / .5)) * 3;

      if (part === 1) {
        /* the blade: held under tension. It trembles — a raised blade on a
           ratchet is under LOAD. The spring integrator scales an offset by
           ~0.105 (vx = (vx + dx*.105)*.78), so offsets here are 4-5x the
           intended on-screen size. */
        p.oy += -prog * 190 + fall + creep;
        p.oy += Math.sin(t * 3.4 + i * .05) * 34 * (1 - drop);
        p.ox += Math.sin(t * 2.7 + i * .04) * 26 * (1 - drop);
        /* and it rings from the impact, once it has landed */
        var ring = (drop >= 1) ? Math.max(0, 1 - (t - .34) / .7) : 0;
        p.oy += Math.sin(t * 46 + i) * ring * 5;
        p.lit = drop > 0 ? 1 : .52 + .48 * prog;
        p.fade = 1;
      } else if (part === 0) {
        /* the uprights: they take the strain. A slow bow under load, plus a
           shudder when the blade lands. */
        var ring2 = (drop >= 1) ? Math.max(0, 1 - (t - .34) / .7) : 0;
        var bow = Math.sin(t * 1.9 + p.ty * .004) * 30 * prog * (1 - drop);
        p.ox += bow + Math.sin(t * 40 + i * .7) * ring2 * 4;
        p.lit = .40 + .34 * prog + ring2 * .4 + .18 * Math.abs(bow) / 30;
        p.fade = .70 + .30 * prog;
      } else {
        /* the rope: pulled taut as it winches, then SLACK the instant the blade
           is released — which is what tells you the drop has happened */
        var slack = drop * 150;
        p.oy += -prog * 190 + slack + creep;
        /* the taut rope vibrates along its length */
        p.ox += Math.sin(t * 5.2 + p.ty * .014) * 28 * (1 - drop);
        p.lit = drop > 0 ? .34 : .70 + .30 * Math.sin(t * 6 + i * .1);
        p.fade = .80;
      }
    },

    /* ---- the ledger, for "I've studied … question me … I can answer all" ----
       Rows of writing stack up as it learns. This is not a circle: it is a
       growing library, then an exam, then the thing that resolves. */

    /* banking: the newest row is being written left to right (a bright nib) */
    bank: function (p, i, o) {
      var rows = (K.rows || 1), per = Math.floor(N / 6);
      var row = Math.min(rows - 1, (i / per) | 0);
      var u = (i % per) / per;
      if (row === rows - 1) {
        var nib = (o.local * .55) % 1.25 - .1;
        p.lit = u < nib ? 1 : .10;
        p.fade = u < nib + .05 ? 1 : .16;
      } else {
        p.lit = .30 + .14 * Math.sin(o.clock * 1.2 + row);
        p.fade = .5;
      }
    },

    /* orbit: the banked rows lift off and turn slowly, held in mind */
    orbit: function (p, i, o) {
      var rows = (K.rows || 2), per = Math.floor(N / 6);
      var row = Math.min(rows - 1, (i / per) | 0);
      var u = (i % per) / per;
      var a = o.clock * .34 + row * 1.06 + u * 1.1;
      var r = (K.r || 250) * (.40 + row * .30);
      var x0 = -520 + u * 1040, y0 = (K.y || 300) + row * 44 - (rows - 1) * 22;
      p.ox += (960 + Math.cos(a) * r - (960 + x0)) * .9;
      p.oy += (520 + Math.sin(a) * r * .62 - (520 + y0)) * .9;
      p.lit = .45 + .3 * Math.sin(o.clock * .8 + row + u * 3);
      p.fade = .8;
    },

    /* answer: "I can answer all" — hits land one after another */
    answer: function (p, i, o) {
      var rows = (K.rows || 3), per = Math.floor(N / 6);
      var row = Math.min(rows - 1, (i / per) | 0);
      var u = (i % per) / per;
      if (row < rows - 1) { p.lit = .30; p.fade = .42; return; }
      var k = ((o.local * .8) % 1.6) / 1.6;
      var on = ((u * 4) | 0) / 4 < k + .08;
      p.lit = on ? 1 : .12;
      p.fade = on ? 1 : .18;
      if (on) p.oy += Math.sin(o.clock * 4 + u * 12) * 3;
    },

    /* solve: the whole library spirals inward into one expression */
    solve: function (p, i, o) {
      var k = Math.min(1, o.local / 1.9);
      var rows = (K.rows || 4), per = Math.floor(N / 6);
      var row = Math.min(rows - 1, (i / per) | 0);
      var u = (i % per) / per;
      var x0 = 960 - 520 + u * 1040;
      var y0 = 520 + (K.y || 300) + row * 44 - (rows - 1) * 22;
      var a = Math.atan2(y0 - 520, x0 - 960), r = Math.hypot(x0 - 960, y0 - 520) * (1 - k);
      p.ox += (960 + Math.cos(a + k * 3) * r - x0) * .95;
      p.oy += (520 + Math.sin(a + k * 3) * r - y0) * .95;
      p.lit = .35 + .65 * k;
      p.fade = .35 + .65 * k;
    },

    /* live wire: a line that becomes a wave and back, forever (AC ⇄ DC) */
    live: function (p, i, o) {
      var u = i / N;
      var head = (o.clock * .8) % 1.4 - .2;
      p.lit = Math.max(.28, 1 - Math.abs(u - head) * 3.4);
      p.oy += Math.sin(o.clock * 3 + u * 26) * 5;
    },

    points: function (p, i, o) { p.ox += Math.sin(o.clock + i) * 2; p.oy += Math.cos(o.clock * 1.3 + i) * 2; },
    charge: function (p, i, o) {
      var head = ((o.clock * .55) % 1.35) - .2;
      var u = i / N;
      p.lit = Math.max(0, 1 - Math.abs(u - head) * 9);
      p.oy += Math.sin(o.clock * 2 + i) * 2;
    },
    /* ---- "then I will give you my DIMENSION" ------------------------------
       The old version just wobbled the axis and blinked a third of the
       particles — a ruler lying there. Measuring is an ACT, so the particles now
       ARE the measurement: a calliper jaw travels the axis and every particle
       near its jaws is squeezed into the gap between them. The distance being
       measured is the subject, so the motion is the measuring. */
    measure: function (p, i, o) {
      var span = 1320, y = 520;
      /* the calliper: two jaws closing on one point, sweeping left to right */
      var u = (o.clock * .18) % 1;
      var cx = 960 - span / 2 + u * span;
      var open = 44 + Math.sin(o.clock * 2.2) * 18;      /* the gap, breathing */
      var d = Math.abs(p.tx - cx);
      var inJaw = d < open * 3.2;
      /* particles between the jaws get pushed to the exact gap edges — the
         point where the measurement is taken */
      if (inJaw && d < open) {
        var edge = (p.tx < cx ? cx - open : cx + open);
        p.ox += (edge - p.tx) * .85;
        p.lit = 1;
        p.fade = 1;
      } else if (inJaw) {
        /* just outside: pulled toward the jaws, like iron to a magnet */
        p.ox += (cx + Math.sign(p.tx - cx) * open - p.tx) * .14;
        p.oy += Math.sin(o.clock * 5 + i * .3) * 4;
        p.lit = .30 + .55 * Math.exp(-Math.abs(d - open) / 90);
        p.fade = .55 + .45 * Math.exp(-Math.abs(d - open) / 140);
      } else {
        /* the rest of the axis hums with the sweep, so nothing is dead.
           (The spring scales offsets by ~0.105, so this hum is written at
           8x the intended on-screen size.) */
        p.oy += Math.sin(o.clock * 1.9 + p.tx * .012) * 55;
        p.ox += Math.sin(o.clock * 1.3 + i * .02) * 40;
        p.lit = .26 + .20 * Math.sin(o.clock * 2.4 + i * .05);
        p.fade = .62;
      }
      /* the reading: the segment already measured is lit end to end */
      if (p.tx < cx) { p.lit = Math.max(p.lit, .58); p.fade = Math.max(p.fade, .82); }
    },
    /* ---- "then I will give you my CIRCUMFERENCE" ---------------------------
       Three beats, one machine. The old three forces were three brightness
       patterns — nothing moved. The circle is a RING OF MATTER under tension:
       (1) `perimeter` walks the ring like a fuse and the part that has burned
       is charged, (2) `deliver` carries the charge around to CLOSE the loop,
       with an actual current flowing along the tangent, (3) `traverse` sends
       the whole ring spinning like a flywheel — the circumference being
       "given" is what all three are doing to it. */
    perimeter: function (p, i, o) {
      var u = i / N, head = (o.clock * .32) % 1;
      var a = u * TAU - Math.PI / 2;
      var d = ((u - head) % 1 + 1) % 1;           /* distance behind the head */
      /* behind the head: charged and oscillating tangentially (a live wire) */
      var live = d < .34;
      var e = live ? 1 - d / .34 : 0;
      /* the whole ring breathes radially and the live part swings ALONG it —
         the spring scales an offset by ~0.105, so both are written at ~8x the
         intended on-screen size */
      p.ox += -Math.sin(a) * (Math.sin(o.clock * 11 + u * 60) * 70 * e
                            + Math.sin(o.clock * 1.9 + u * 22) * 90);
      p.oy += Math.cos(a) * (Math.sin(o.clock * 11 + u * 60) * 70 * e
                            + Math.sin(o.clock * 1.9 + u * 22) * 90);
      p.lit = live ? .35 + .65 * e : .22;
      p.fade = live ? .78 + .22 * e : .48;
    },
    deliver: function (p, i, o) {
      var u = i / N, head = (o.clock * .45) % 1;
      var a = u * TAU - Math.PI / 2;
      /* the current: a travelling pulse that thins as it goes, so the loop
         visibly CARRIES something rather than merely sparkling */
      var d = ((u - head) % 1 + 1) % 1;
      var tail = Math.exp(-d * 4.2);
      p.lit = .16 + .84 * tail;
      p.fade = .40 + .60 * tail;
      /* the pulse drags particles along the tangent — a current, not a glow */
      var along = tail * 16;
      p.ox += -Math.sin(a) * along;
      p.oy += Math.cos(a) * along;
      /* the leading edge snaps bright as it passes each particle */
      var front = Math.exp(-Math.abs(d - .02) * 30);
      p.lit = Math.min(1, p.lit + front * .6);
      /* behind the pulse the wire is still live: it hums along its tangent.
         Written at ~8x the intended size, because the spring scales by 0.105. */
      p.ox += -Math.sin(a) * Math.sin(o.clock * 2.1 + u * 40) * 90;
      p.oy += Math.cos(a) * Math.sin(o.clock * 2.1 + u * 40) * 90;
    },
    traverse: function (p, i, o) {
      var u = i / N;
      /* the flywheel: the entire ring spins, accelerating as it is given away */
      var k = Math.min(1, o.local / 2.2);
      var spin = o.clock * (.30 + k * 1.5);
      var a = u * TAU - Math.PI / 2 + spin;
      var r = 300;
      p.ox += (960 + Math.cos(a) * r - p.tx) * .55;
      p.oy += (520 + Math.sin(a) * r - p.ty) * .55;
      /* every particle is equally alive: it is one object rotating */
      p.lit = .55 + .45 * Math.sin(o.clock * 3 + u * 40);
      p.fade = .90;
      /* motion blur along the direction of travel */
      p.ox += -Math.sin(a) * 10 * k;
      p.oy += Math.cos(a) * 10 * k;
    },
    /* the circle unrolling into its own trace: a hot contact point travels it */
    roll: function (p, i, o) {
      var u = i / N, roll = Math.min(1, o.local / 2.4);
      var head = roll % 1;
      p.lit = Math.max(.12, 1 - Math.abs(u - head) * 5);
      var drawn = u < roll;
      p.fade = drawn ? .85 : .28;
      if (drawn) p.lit = Math.max(p.lit, .55);
    },
    tangents: function (p, i, o) {
      var u = i / N, k = Math.min(1, o.local / 1.6);
      var slope = Math.cos(u * TAU * 1.15 - Math.PI / 2);
      var arm = Math.sin(o.clock * .9 + u * 9) * 150 * k;
      p.ox += arm;
      p.oy += slope * arm * .55;
      p.lit = .35 + .65 * Math.abs(Math.sin(o.clock * 2 + u * 14));
    },
    /* ---- "If I approach infinity / then you can be my LIMITATIONS" ---------
       The curve is A·e^(kx)·sin — unbounded growth. The TARGET already puts
       each particle on the curve, so the force must not fight it (an offset
       toward "520 - ride" is mostly a correction back to roughly where the
       spring already is, and it measured 0.05px/frame). Instead the force
       TRAVELS the wave: the phase runs, so the whole shape oscillates in place
       like a driven string, and `press` sweeps the envelope down. */
    grow: function (p, i, o) {
      var u = i / N;
      var span = 14, x = u * span;
      var amp = .11 * Math.exp(.255 * x);          /* the unbounded envelope */
      /* the wave TRAVELS: phase runs with the clock, so the string is driven */
      var phase = o.clock * 3.4 - x * (K.w || 3.0);
      var old = Math.sin((o.clock - .05) * 3.4 - x * (K.w || 3.0));
      var dy = (Math.sin(phase) - old) * amp * 130;
      p.oy += dy * 4.5;
      /* brightness and violence rise with the amplitude */
      p.lit = .22 + .78 * Math.min(1, amp / .95);
      p.fade = .50 + .50 * Math.min(1, amp / .95);
      /* and the particles shear along the wave's slope, like spray */
      var slope = Math.cos(phase) * amp;
      p.ox += slope * 55 * Math.sin(o.clock * 6 + u * 9);
    },
    press: function (p, i, o) {
      var u = i / N, k = Math.min(1, o.local / 2.2);
      var span = 14, x = u * span;
      /* the envelope descends from the right: where it has arrived, the wave
         is crushed flat and nearly still; ahead of it, still wild */
      var front = 1 - k;
      var pressed = x > front * span;
      var amp = pressed
        ? (.95 * Math.exp(-.19 * x) + .13)
        : .11 * Math.exp(.255 * x);
      var phase = o.clock * 3.4 - x * (K.w || 3.0);
      var old = Math.sin((o.clock - .05) * 3.4 - x * (K.w || 3.0));
      var dy = (Math.sin(phase) - old) * amp * 130;
      p.oy += dy * (pressed ? 1.6 : 4.5);
      /* the press front itself is a visible event: bright and violent */
      var near = Math.exp(-Math.abs(x - front * span) * 3.0);
      p.lit = .28 + .72 * near + .22 * Math.min(1, amp / .95);
      p.fade = .55 + .45 * near;
      p.ox += near * Math.sin(o.clock * 22 + u * 70) * 30;
    },
    wave: function (p, i, o) { p.oy += Math.sin(o.clock * 2.2 + p.tx * .012) * 16; },
    /* "Lay down your pieces" — the parts come apart and fall.
       Ranked against y so it reads as collapse from the top down, with the
       lower rows landing first, not a uniform drift. */
    falling: function (p, i, o) {
      var u = i / N;
      var fall = (o.clock * (.30 + u * .22)) % 1.5;
      p.oy += fall * 340;
      p.ox += Math.sin(o.clock * 1.4 + u * 12) * 16;
      p.lit = .20 + .70 * Math.max(0, 1 - fall / 1.2);
      p.fade = Math.max(.12, 1 - fall / 1.35);
    },
    infinity: function (p, i, o) {
      var t = o.clock * 1.6;
      p.oy += Math.sin(p.tx * .09 + t) * 90 * Math.min(1, .3 + (o.clock % 6) / 4);
      p.ox += Math.sin(p.ty * .02 + t) * 24;
    },
    walls: function (p, i, o) {
      var half = 700 * Math.max(0, 1 - (o.local / 1.6));
      p.ox += (p.tx > 960 ? 1 : -1) * Math.max(0, Math.abs(p.tx - 960) - half) * .9;
    },
    reverse: function (p, i, o) {
      var d = Math.sin(o.local * 1.4) > 0 ? 1 : -1;
      p.ox += d * ((i / N - .5) * 380);
      p.lit = .4 + .6 * Math.abs(Math.sin(o.local * 2));
    },
    alternate: function (p, i, o) {
      var ph = Math.sin(o.local * 5.2);
      p.ox += ph * ((i / N - .5) * 520);
      p.lit = .3 + .7 * Math.abs(ph);
    },
    blind: function (p, i, o) { p.fade = Math.max(0, 1 - o.local / 1.4); },
    dizzy: function (p, i, o) {
      var a = o.clock * 1.9, dx = p.tx - 960, dy = p.ty - 520;
      var c = Math.cos(a), s = Math.sin(a);
      p.ox += (dx * c - dy * s - dx) * .9;
      p.oy += (dx * s + dy * c - dy) * .9;
      p.lit = .5 + .5 * Math.sin(o.clock * 6 + i * .3);
    },
    /* ---- time travel -------------------------------------------------------
       Measured: the OLD version read `o.clock` and applied a single fixed
       offset, so the cloud slid once in the first ~0.4s and then sat perfectly
       still for the remaining 2 seconds of the line — centroid travel of only
       167px, all of it in the first frames. That is why "we can travel time"
       had no animation: the motion was over before the words arrived.

       This is a perspective WARP that never stops. Each particle has a depth
       z that runs from far to near and recycles, projected as 1/(1+z*k), so it
       keeps streaming out of the vanishing point for the whole beat. `dir`
       flips the flow for "To B.C", and `rate` can be raised. */
    travel: function (p, i, o) {
      var dir = (K.dir) || 1;
      var rate = (K.rate == null ? .55 : K.rate);
      var u = i / N;
      /* depth cycles in 0..1; each particle is offset along the stream by its
         own u so the corridor is continuously populated, never a pulse */
      var z = ((u + o.clock * rate * dir) % 1 + 1) % 1;
      /* near the vanishing point (z -> 0) the lane radius collapses */
      var spread = .06 + z * z * 1.35;
      var dx = p.tx - 960, dy = p.ty - 500;
      var L = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var px2 = 960 + dx * spread;
      var py2 = 500 + dy * spread * .72;
      p.ox += (px2 - p.tx) * .96;
      p.oy += (py2 - p.ty) * .96;
      /* brightness: burning bright as it passes the camera, dark far away */
      p.lit = .10 + .90 * Math.min(1, z * 1.6);
      p.fade = .12 + .88 * Math.min(1, z * 1.25);
      /* a little chromatic smear on the ones streaking past */
      if (z > .82) {
        var st = (z - .82) / .18;
        p.ox += dx / L * st * 26 * dir;
        p.oy += dy / L * st * 26 * dir;
      }
    },
    merge: function (p, i, o) {
      var side = i % 2 ? 1 : -1;
      var k = Math.min(1, o.local / 1.1);
      p.ox += side * (1 - k) * 700;
      p.oy += (1 - k) * (i % 5 - 2) * 40;
    },
    sink: function (p, i, o) {
      var k = Math.min(1, o.local / 2.2);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox -= dx * k * .55; p.oy -= dy * k * .45;
      p.lit = .25 + .5 * (1 - k);
    },
    fill: function (p, i, o) {
      var u = (p.tx - 360) / 1200, k = Math.min(1, o.local / 2.4);
      p.fade = u < k ? 1 : .06;
      p.lit = u < k ? 1 : .1;
    },
    bootsweep: function (p, i, o) {
      var u = (p.tx - 360) / 1200, head = (o.local * .8) % 1.2;
      p.lit = u < head ? 1 : .1;
      p.oy += u < head && u > head - .12 ? -10 : 0;
    },
    pulse: function (p, i, o) {
      var k = .5 + .5 * Math.sin(o.clock * 3.4);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox += dx * k * .10; p.oy += dy * k * .10;
      p.lit = .4 + .6 * k;
    },
    satisfy: function (p, i, o) {
      var k = Math.min(1, o.local / 2.6);
      var d = Math.abs(p.tx - 960);
      p.lit = d < k * 640 ? 1 : .12;
    },
    beat: function (p, i, o) {
      var k = Math.pow(Math.max(0, Math.sin(o.clock * 5.4)), 6);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox += dx * k * .16; p.oy += dy * k * .16;
      p.lit = .45 + .55 * k;
    },

    /* ---- the training loop: the parameter cloud descending toward "you" --- */

    /* random init: a wide, jittery cloud */
    seed: function (p, i, o) {
      var u = i / N;
      p.lit = .30 + .35 * Math.abs(Math.sin(u * 40 + o.clock));
      p.fade = .55;
      p.oy += Math.sin(o.clock * 3 + u * 60) * 6;
    },
    /* descent: jitter decays with the epoch count, a gradient sweeps the cloud */
    train: function (p, i, o) {
      var u = i / N, ep = (K.ep || 1);
      var jit = 26 * Math.exp(-ep * .55) + 2;
      p.ox += Math.sin(o.clock * 7 + u * 90) * jit;
      p.oy += Math.cos(o.clock * 6 + u * 70) * jit;
      var head = (o.clock * .7) % 1;
      p.lit = .30 + .70 * Math.max(0, 1 - Math.abs(u - head) * 4);
    },
    /* plateau: it cannot improve alone, so one bright question goes out */
    ask: function (p, i, o) {
      var u = i / N;
      p.lit = .22 + .18 * Math.abs(Math.sin(o.clock * 1.2 + u * 12));
      p.fade = .5;
      var q = (o.clock * .5) % 1;
      if (Math.abs(u - q) < .012) { p.lit = 1; p.fade = 1; p.ox -= 40; p.oy -= 30; }
    },
    /* answered: the loss drops hard and the cloud snaps in with an overshoot */
    answer: function (p, i, o) {
      var k = Math.min(1, o.local / 1.3);
      var over = Math.sin(k * Math.PI * 1.6) * Math.exp(-k * 2.2);
      p.ox += over * (960 - p.tx) * .22;
      p.oy += over * (520 - p.ty) * .22;
      p.lit = .35 + .65 * k;
      p.fade = .6 + .4 * k;
    },
    /* converged: a tight, calm shell */
    converge: function (p, i, o) {
      var u = i / N;
      var b = 1 + .03 * Math.sin(o.clock * 1.6);
      p.ox += (960 - p.tx) * (1 - b) * .5;
      p.oy += (520 - p.ty) * (1 - b) * .5;
      p.lit = .55 + .4 * Math.sin(o.clock * 1.1 + u * 8);
      p.fade = .8;
    },
    /* a heart assembling. Two things must be true at once: the whole outline
       has to be VISIBLE (or the shape never reads), and the difference between
       "already sung" and "not yet sung" has to be OBVIOUS (or the filling-in
       is invisible). So the ghost is dim but solid, and a landed wedge is
       bright-white with a hard impact flash. */
    piece: function (p, i, o) {
      var landed = (K.pieces == null) ? 1 : K.pieces;
      var w = p.wedge == null ? 0 : p.wedge;
      if (w >= landed) {
        p.fade = .55;
        p.lit = .12;                      /* ghost: present but clearly unfilled */
        p.oy += Math.sin(o.clock * 1.1 + i * .05) * 2;
      } else {
        var age = landed - 1 - w;
        p.fade = 1;
        if (age < 1) {
          /* the wedge that just landed: flash hard, kick outward, settle */
          var k = Math.min(1, (o.local % 1.4) / .50);
          p.lit = 1;
          p.ox += Math.cos(w * 1.7) * (1 - k) * 30;
          p.oy += Math.sin(w * 1.7) * (1 - k) * 30;
        } else {
          p.lit = .78 + .06 * Math.sin(o.clock * 1.6 + w);
        }
      }
    },
    execute: function (p, i, o) {
      var row = ((p.ty - 200) / 45) | 0;
      var head = (o.clock * 5) % 18;
      p.lit = row < head ? 1 : .12;
      p.ox += (i % 5 - 2) * 1.2;
    },
    cage: function (p, i, o) {
      var k = Math.min(1, o.local / 1.5);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox -= dx * (1 - k) * 1.1;
      p.oy -= dy * (1 - k) * 1.1;
    },
    recurse: function (p, i, o) {
      var k = .5 + .5 * Math.sin(o.clock * 1.1);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox -= dx * k * .35; p.oy -= dy * k * .35;
      p.lit = .3 + .7 * k;
    },
    form: function (p, i, o) { p.lit = .7 + .3 * Math.sin(o.clock * 2 + i * .05); },
    drain: function (p, i, o) {
      var u = i / N, k = Math.min(1, o.local / 2.6);
      var go = u < k;
      p.ox += go ? (o.px - p.tx) * (k - u) * .9 : 0;
      p.oy += go ? (o.py - p.ty) * (k - u) * .9 : 0;
      p.fade = go ? Math.max(.15, 1 - (k - u) * 1.4) : 1;
    },
    purr: function (p, i, o) {
      var v = Math.sin(o.clock * 150);
      var dx = p.tx - 960, dy = p.ty - 520, L = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      p.ox += dx / L * v * 5; p.oy += dy / L * v * 5;
      p.lit = .55 + .45 * Math.abs(v);
    },
    expand: function (p, i, o) {
      var k = Math.min(1, o.local / 2.4), dx = p.tx - 960, dy = p.ty - 520;
      p.ox += dx * k * 1.5; p.oy += dy * k * 1.5;
      p.fade = 1 - k * .55;
    },
    proof: function (p, i, o) {
      var d = Math.sqrt((p.tx - o.px) * (p.tx - o.px) + (p.ty - o.py) * (p.ty - o.py));
      var near = d < 300;
      p.fade = near ? 1 : Math.max(0, 1 - (d - 300) / 220) * .35;
      p.lit = near ? 1 : .25;
      if (near) { p.ox += (o.px - p.tx) * .06; p.oy += (o.py - p.ty) * .06; }
    },

    /* ---- the only god -----------------------------------------------------
       "If I'm the only god" — the upright stands ALONE. The particles hold the
       vertical beam absolutely still (a god does not wobble), and the only
       motion is a light travelling up it, like something being lit from below.
       Everything else is emptied out: nothing beside it, nothing it needs. That
       stillness is the point of the word "only". */
    stand: function (p, i, o) {
      var u = i / N;
      var head = (o.clock * .30) % 1.35;            /* light climbs the beam */
      p.lit = .20 + .80 * Math.max(0, 1 - Math.abs(u - head) * 3.4);
      p.fade = .42 + .58 * Math.max(0, 1 - Math.abs(u - head) * 2.6);
      p.ox += Math.sin(o.clock * .8 + u * 6) * 1.6;  /* alive, not uncertain */
    },

    /* "then you're the proof of my existence" — the crossbar ARRIVES.
       This is the lyric's own argument: a god alone is not self-evident, so the
       proof must come from outside and MEET it. Bar particles sweep in from
       both sides and lock onto the upright; once landed, the joint glows. */
    crucify: function (p, i, o) {
      var u = i / N;
      var k = Math.min(1, o.local / .70);            /* the arrival, 0 -> 1 */
      /* The joint's y is ASKED for, not assumed: artForm fits the raster to a
         bounding box, so the bar's screen height has to be derived through the
         same transform. Hardcoding it left the particle crossbar ~80px above
         the vector crossbar, which read as a dotted row floating over the solid
         bar. */
      var barY = crossBarY();
      var onBar = Math.abs(p.ty - barY) < 42;
      if (onBar) {
        var side = (p.tx < 960) ? -1 : 1;
        p.ox += side * (1 - k) * 620;                /* meet in the middle */
        p.oy += (1 - k) * (i % 7 - 3) * 22;
        p.lit = .25 + .75 * k;
        p.fade = .30 + .70 * k;
        if (k >= .999) {
          var dj = Math.abs(p.tx - 960);
          var pulse = Math.pow(Math.max(0, Math.sin(o.clock * 3.0)), 6);
          p.lit = Math.max(p.lit, .72 + .28 * pulse * (dj < 260 ? 1 : .3));
        }
      } else {
        var dj2 = Math.abs(p.ty - barY);
        p.lit = .30 + .50 * k * Math.max(0, 1 - dj2 / 200);
        p.fade = .58 + .42 * k;
        p.ox += Math.sin(o.clock * .7 + u * 5) * 1.4;
      }
    },
    flip: function (p, i, o) {
      var k = Math.sin(o.local * 1.1);
      p.ox += (p.tx - 960) * k * .45;
      p.lit = .5 + .5 * Math.abs(k);
    },
    flip2: function (p, i, o) {
      var k = -Math.sin(o.local * 1.3);
      p.ox += (p.tx - 960) * k * .5;
      p.oy += (p.ty - 520) * k * .25;
      p.lit = .5 + .5 * Math.abs(k);
    },
    /* ---- AM to PM ----------------------------------------------------------
       "From AM to PM" is a day passing. This is a CLOCK FACE: particles sit on
       the hour marks and the hand sweeps from the AM half into the PM half, so
       the ring is a dial and the motion is time.

       THE CROSSING IS PINNED TO THE MEASURED ACCENT. See dialSweep() above. */
    dial: function (p, i, o) {
      var sweep = dialSweep();
      var amp = dialAmPm();
      var hand = sweep * TAU - Math.PI / 2;      /* noon at the top */
      var dx = p.tx - DIAL.cx, dy = p.ty - DIAL.cy;
      var rr = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var pa = Math.atan2(dy, dx);

      /* THE DIAL TURNS. Lighting only the particles under the hand left 88% of
         the face frozen (measured 0.1px/frame), and a slow drift was worse
         still. The gearwork has to actually rotate: the dust ring turns at
         about a third of the hand's rate, so the hand visibly gains on it and
         sweeps across the marks, and every particle is in continuous motion. */
      var rot = o.clock * .055 * TAU;
      var vis = pa + rot;
      p.ox += Math.cos(vis) * rr - dx;
      p.oy += Math.sin(vis) * rr - dy;

      /* each particle's part of the day is spent as the hand comes round: it
         charges up while the hand is away and flares when the hand sweeps
         through it. Derived from the hand's angle, NOT from stored state —
         a stateful version saturated after 9s and then snapped back. */
      var ahead = ((vis - hand) % TAU + TAU) % TAU;
      var charge = 1 - ahead / TAU;              /* 0 just swept, 1 due next */
      var flare = Math.exp(-ahead * 2.4);        /* the moment of contact */
      p.lit = Math.max(.24 + .50 * charge, flare);
      p.fade = Math.min(1, Math.max(.42 + .44 * charge, .55 + .45 * flare));

      /* IN THE AM/PM WINDOW THE TWO HALVES READ AS TWO TIMES OF DAY.
         Whichever half the hand is in is lit; the other is spent. `vis` is the
         particle's own angle, so a particle on the left is an "AM" mark and one
         on the right is a "PM" mark. */
      if (amp >= 0) {
        /* screen x > centre is the right (PM) half; the hand sits in the AM
           half until the 94.90 crossing */
        var rightHalf = Math.cos(pa) >= 0;
        var mine = (amp === 1) ? !rightHalf : rightHalf;   /* is this my time of day? */
        var w = mine ? 1 : .16;
        p.lit *= mine ? 1.0 : .42;
        p.fade *= w;
        /* and the hand's leading edge burns */
        p.lit = Math.max(p.lit, flare * (amp === 1 ? 1 : 1));
      }
    },

    /* ---- "feel your vibrations" -------------------------------------------
       The old version was a travelling ripple across a ring — decoration, not
       vibration. A circular membrane resonates in STANDING WAVES: its modes have
       circular and diametric NODES, and the skin oscillates between the peaks
       without travelling anywhere. So this drives the disc with a real Bessel-
       like mode shape (a few radial rings of alternating phase), multiplied by
       a time term, which is what makes a drum skin look like a drum skin.
       The excitation comes from YOUR pointer: the wave is strongest nearest to
       you, because "I can feel your vibrations" — the source is you, not me. */
    resonate: function (p, i, o) {
      var dx = p.tx - MEMB.cx, dy = p.ty - MEMB.cy;
      var r = Math.sqrt(dx * dx + dy * dy);
      var rn = r / MEMB.R;                             /* normalised radius */
      var a = Math.atan2(dy, dx);
      /* mode (0,3): three diametric nodes plus the radial nodes of cos(rn*K).
         K and R are shared with the vector layer, which draws those same nodal
         circles — the two must not be computed twice (see DIAL/MEMB above). */
      var mode = Math.cos(3 * a) * Math.cos(rn * MEMB.K);
      var clamped = Math.max(0, 1 - rn * rn * .72);    /* falls off at the rim */
      var t = o.clock * 5.2;
      var w = mode * clamped * Math.sin(t);
      p.ox += dx / Math.max(1, r) * w * 44;
      p.oy += dy / Math.max(1, r) * w * 44;
      /* brightness shows the standing wave: nodes stay dark and still. But the
         FLOOR is high on purpose — a membrane whose nodes are invisible is just
         a dim disc, and the pattern is the whole point. */
      p.lit = .34 + .66 * Math.abs(w);
      p.fade = .52 + .48 * Math.abs(w);
      /* and it couples to you: the nearer the pointer, the harder it rings */
      var d = Math.sqrt((p.tx - o.px) * (p.tx - o.px) + (p.ty - o.py) * (p.ty - o.py));
      var couple = Math.max(0, 1 - d / 700);
      p.ox += dx / Math.max(1, r) * couple * Math.sin(o.clock * 9) * 26;
      p.oy += dy / Math.max(1, r) * couple * Math.sin(o.clock * 9) * 26;
      p.lit = Math.min(1, p.lit + couple * .4);
    },
    swap: function (p, i, o) {
      var k = Math.sin(o.local * 1.5), side = p.tx > 960 ? 1 : -1;
      p.ox += side * k * 260; p.lit = .45 + .55 * Math.abs(k);
    },
    swap2: function (p, i, o) {
      var k = Math.sin(o.local * 1.9), side = p.ty > 520 ? 1 : -1;
      p.oy += side * k * 190; p.lit = .45 + .55 * Math.abs(k);
    },
    trance: function (p, i, o) {
      var a = o.clock * .5, dx = p.tx - 960, dy = p.ty - 520;
      var c = Math.cos(a), s = Math.sin(a);
      p.ox += (dx * c - dy * s - dx) * .8 + Math.sin(o.clock + i * .02) * 26;
      p.oy += (dx * s + dy * c - dy) * .8 + Math.cos(o.clock * .9 + i * .02) * 22;
      p.lit = .35 + .4 * Math.sin(o.clock * .9 + i * .05) + .25;
    },
    feel: function (p, i, o) {
      var d = Math.sqrt((p.tx - o.px) * (p.tx - o.px) + (p.ty - o.py) * (p.ty - o.py));
      var w = Math.sin(d * .05 - o.clock * 7) * Math.max(0, 1 - d / 900);
      var dx = p.tx - o.px, dy = p.ty - o.py, L = Math.max(1, d);
      p.ox += dx / L * w * 44; p.oy += dy / L * w * 44;
      p.lit = .3 + .7 * Math.abs(w);
    },
    close: function (p, i, o) { p.lit = .5 + .5 * Math.sin(o.clock * 2); p.fade = Math.max(.1, Math.min(1, o.local / 2)); },
    complete: function (p, i, o) {
      var t = i / N, sealed = Math.min(1, o.local / 1.8);
      var gap = (1 - sealed) * .5;
      var a = -.5 + t * (TAU - gap * 3);
      p.ox += Math.cos(a + 1.5) * 0 - (p.tx - (960 + Math.cos(a) * 300));
      p.oy += 0 - (p.ty - (520 + Math.sin(a) * 300));
      p.lit = sealed;
    },
    lose: function (p, i, o) {
      var chunk = ((i / N) * 6) | 0;
      if (chunk <= lost) {
        p.ox += (chunk % 2 ? 1 : -1) * 1800; p.oy += -600 + chunk * 120;
        p.fade = 0;
      } else { p.lit = .8; }
    },
    isolate: function (p, i, o) {
      p.fade = i % 37 === 0 ? 1 : .04;
      p.lit = 1;
    },
    erase: function (p, i, o) {
      var u = i / N, k = Math.min(1, o.local / 2.4);
      p.fade = u < k ? .05 : .75;
      p.lit = u < k ? .08 : .8;
      if (u < k) p.ox += (o.px - p.tx) * .04;
    },
    regret: function (p, i, o) {
      var k = Math.min(1, o.local / 2.2);
      var u = i / N;
      p.ox += Math.sin(o.clock * 1.2 + i) * 10 * (1 - k);
      p.fade = u < .45 ? Math.max(.06, 1 - k) : .8;
      p.lit = u < .45 ? .2 : .7;
    },
    resist: function (p, i, o) {
      var dx = p.tx - o.px, dy = p.ty - o.py, d = Math.max(60, Math.sqrt(dx * dx + dy * dy));
      var push = Math.max(0, 1 - d / 420);
      p.ox += dx / d * push * 240; p.oy += dy / d * push * 240;
      p.lit = .3 + .7 * push;
    },
    glitch: function (p, i, o) {
      var step = Math.floor(o.clock * 12);
      var r = Math.sin(step * 12.9898 + i) * 43758.5453;
      r = r - Math.floor(r);
      p.ox += (r - .5) * 90;
      p.oy += (Math.sin(step * 78.233 + i) * 43758.5453 % 1) * 40;
      p.lit = r > .5 ? 1 : .2;
    },
    error: function (p, i, o) {
      p.ox += Math.sin(o.clock * 9 + i * .7) * 34;
      p.oy += Math.cos(o.clock * 11 + i * .3) * 22;
      p.fade = .35 + .65 * Math.abs(Math.sin(o.clock * 7 + i));
    },
    shatter: function (p, i, o) {
      var k = Math.max(0, 1 - o.local / .5);
      var a = (i * 2.399963) % TAU;
      p.ox += Math.cos(a) * k * 320; p.oy += Math.sin(a) * k * 320;
      p.lit = .4 + .6 * k;
    },
    blood: function (p, i, o) {
      p.oy += Math.sin(o.clock * 3 + i * .1) * 8;
      p.lit = .7 + .3 * Math.sin(o.clock * 5 + i * .2);
    },
    count: function (p, i, o) {
      var n = (K.n) || 1, per = N / 6, grp = (i / per) | 0;
      if (grp >= n) { p.fade = .05; return; }
      var a = grp * 1.047 + .2, r = 330;
      p.ox += (960 + Math.cos(a) * r - p.tx) * .8;
      p.oy += (520 + Math.sin(a) * r - p.ty) * .8;
      p.lit = grp === n - 1 ? 1 : .35;
    },
    learn: function (p, i, o) {
      var k = Math.min(1, (o.local % 3) / 1.6);
      p.fade = (i / N) < k ? 1 : .08;
      p.lit = (i / N) < k ? .95 : .15;
      p.oy += Math.sin(o.clock + i * .02) * 4;
    },
    ask: function (p, i, o) {
      var a = i / N * TAU, k = .5 + .5 * Math.sin(o.clock * 2.4);
      p.ox += Math.cos(a) * k * 70; p.oy += Math.sin(a) * k * 70;
      p.lit = .35 + .65 * k;
    },
    answer: function (p, i, o) {
      var k = ((o.clock * 1.6) % 1.6) / 1.6;
      var u = i / N;
      p.lit = Math.abs(u - k) < .08 ? 1 : .25;
      p.fade = .3 + .7 * (1 - Math.abs(u - k));
    },
    solve: function (p, i, o) {
      var k = Math.min(1, (o.local % 4) / 2.6);
      p.fade = (i / N) < k ? 1 : .1;
      p.lit = .55 + .45 * Math.sin(o.clock * 3 + i * .05);
      var dx = p.tx - 960, dy = p.ty - 520;
      p.ox += dx * Math.sin(o.clock * 2) * .03; p.oy += dy * Math.cos(o.clock * 2) * .03;
    },
    open: function (p, i, o) {
      var k = Math.min(1, o.local / 1.8), dx = p.tx - 960, dy = p.ty - 520;
      p.ox += dx * k * .9; p.oy += dy * k * .9; p.fade = 1 - k * .35;
    },
    trapped: function (p, i, o) {
      var k = Math.min(1, o.local / 1.6), dx = p.tx - 960, dy = p.ty - 520;
      p.ox -= dx * (1 - k) * 1.2 - dx * .12;
      p.oy -= dy * (1 - k) * 1.2 - dy * .12;
      p.lit = .6 + .4 * k;
    },
    memories: function (p, i, o) {
      p.fade = .1 + .35 * Math.abs(Math.sin(o.clock * .5 + i * .001));
      p.lit = .4;
      p.ox += Math.sin(o.clock * .3 + i) * 26; p.oy += Math.cos(o.clock * .24 + i) * 22;
    },
    execution: function (p, i, o) {
      var a = (i * 2.399963) % TAU, k = Math.min(1, o.local / .7);
      p.ox += Math.cos(a) * (1 - k) * 420;
      p.oy += Math.sin(a) * (1 - k) * 420;
      p.lit = .5 + .5 * k;
    },
    hold: function (p, i, o) {
      var d = Math.sqrt((p.tx - 960) * (p.tx - 960) + (p.ty - 520) * (p.ty - 520));
      p.fade = Math.max(0, 1 - d / 420) * (i % 3 === 0 ? 1 : .25);
      p.lit = .5 + .5 * Math.sin(o.clock * 2 + i * .1);
    },

    /* ---- EMERGENCE: it wakes, then it goes --------------------------------
       This is the last thing that happens in the song, and it is the only beat
       the program does entirely on its own. Everything before it was a
       reaction — to the pointer, to the commands, to the world.

       `awaken` — the core lights from the inside. The pulse starts at the
       centre and travels outward through the body, and the rim, which is still
       scattered out in the dark after the deletion, is drawn back IN. The light
       gathers rather than being pushed around.

       `ascend` — the exit. The body rises, the rim rises further and faster so
       the shape opens, and the particles stop being a figure at all: they
       stream up past the top of the frame. It leaves. That is the ending — not
       a dark screen with a blinking cursor. */
    awaken: function (p, i, o) {
      var r = (p.wedge == null) ? 0 : p.wedge;     /* 0 core … 1 rim */
      var t = o.local;
      var pull = Math.min(1, t / 1.5);
      /* gather: the scattered matter is drawn toward the core */
      p.ox += (960 - p.tx) * pull * .11 * r;
      p.oy += (561 - p.ty) * pull * .11 * r;
      /* a breath that starts at the centre and travels out through the body */
      var wave = Math.sin(t * 3.1 - r * 6.0);
      p.ox += Math.cos(i * .7) * wave * 9 * (1 - r);
      p.oy += Math.sin(i * .7) * wave * 9 * (1 - r);
      /* lit from the inside out: the core is the hottest part */
      p.lit = Math.max(p.lit, (1 - r * .72) * (.62 + .38 * Math.abs(wave)));
      p.fade = 1;
    },

    ascend: function (p, i, o) {
      var r = (p.wedge == null) ? 0 : p.wedge;
      var t = o.local;
      var up = Math.min(1, t / 1.9);
      /* the body rises; the rim outruns the core, so the shape opens as it
         leaves rather than travelling as a rigid lump */
      p.oy -= (.35 + r * 1.5) * up * up * 760;
      p.ox += (p.tx - 960) * up * .55 * r;
      p.lit = Math.max(p.lit, .72 + .28 * (1 - r));
      p.fade = 1;
    }
  };

  /* --------------------------------------------------------------- engine */
  function init(o) {
    host = o.host;
    cv = document.createElement('canvas');
    cv.id = 'pvfield';
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:1;';
    host.appendChild(cv);
    ctx = cv.getContext('2d');
    for (var i = 0; i < N; i++) {
      P.push({ x: rnd(0, W), y: rnd(0, H), vx: 0, vy: 0, tx: 960, ty: 520, ox: 0, oy: 0,
               lit: .6, fade: 1, ph: Math.random(), w: 0, alive: 1 });
    }
    /* expose particle positions so the rest of the page can ignore them */
    root.PVFIELD.enabled = true;
    /* allocate the backing store at the size it will really occupy on screen */
    setRenderScale(RS);
  }

  /* ---------------------------------------------------------------------------
     RESOLUTION ADAPTATION.
     The canvas used to be a fixed 1920x1080 buffer stretched to the display by
     CSS. On a 2.5K panel that is a 1.33x upscale of every pixel: soft edges and
     the shimmer that reads as jelly during motion.

     So the backing store is allocated at logical x render-scale, and the drawing
     context is scaled by the same amount — every coordinate below stays in the
     1920x1080 logical space, nothing else in this file has to change.

     ORDER MATTERS: the driver calls this from fit() on resize, which runs
     BEFORE init() has created the canvas. So the value is always remembered,
     and applied when there is a canvas to apply it to. Calling it early used to
     throw "Cannot set properties of undefined" and take the whole page down.
     --------------------------------------------------------------------------- */
  var RS = 1;
  function setRenderScale(s) {
    if (!(s > 0)) s = 1;
    RS = s;                                   /* remember, even before init */
    if (!cv) return;                          /* init() will apply it */
    var w = Math.round(W * s), h = Math.round(H * s);
    if (cv.width === w && cv.height === h) return;
    cv.width = w;
    cv.height = h;
    /* CSS size stays the LOGICAL size: the stage's own CSS transform still does
       the display scaling, so this only changes how many real pixels back it */
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
  }
  /* the one place the transform is established, so nothing can forget it */
  function resetTransform() {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
  }

  var curTargets = null, tgtB = null, appliedT = -1, blend = 0, blendSpec = null;

  function buildFrom(factory, k) {
    var fn = factory(k || {});
    var arr = new Array(N);
    for (var i = 0; i < N; i++) arr[i] = fn(i, k);
    return arr;
  }

  function build(name, k) {
    /* every FORM entry is a FACTORY: call it with the params to get the
       per-particle function, then call that with the index. */
    var arr = buildFrom(FORM[name] || FORM.scatter, k);
    curTargets = arr;
    tgtB = null; blendSpec = null;
    /* stagger: order particles by x so forms assemble as a sweep, not a pop */
    var order = arr.map(function (p, i) { return [p[0], i]; }).sort(function (a, b) { return a[0] - b[0]; });
    for (var j = 0; j < N; j++) {
      P[order[j][1]].delay = (j / N) * ((k && k.spread != null) ? k.spread : .55);
      P[order[j][1]].w = 0;
    }
    morph = 0;
  }

  /* ---- continuous morph between two forms -------------------------------
     For "AC ⇄ DC" and "F ⇄ M" a cut between two target sets reads as two
     slides. What those lines actually describe is ONE thing changing back and
     forth, so we hold both target sets and slide a single parameter between
     them for the whole beat.                                                */
  function buildMorph(aName, bName, ka, kb) {
    curTargets = buildFrom(FORM[aName] || FORM.scatter, ka);
    tgtB = buildFrom(FORM[bName] || FORM.scatter, kb);
    blendSpec = { a: aName, b: bName };
    blend = 0;
    var order = curTargets.map(function (p, i) { return [p[0], i]; }).sort(function (x, y) { return x[0] - y[0]; });
    for (var j = 0; j < N; j++) {
      P[order[j][1]].delay = (j / N) * .5;
      P[order[j][1]].w = 0;
    }
    morph = 0;
  }

  function setLine(line, override) {
    var spec = override || (root.PVFORCE ? root.PVFORCE.at(line.t) : null);
    if (!spec) return;
    /* when an override is passed, always apply it (letter beats share times) */
    if (!override && spec.t === appliedT) return;      /* keyword beats change nothing */
    appliedT = spec.t;
    form = spec.form || form;
    force = spec.force || force;
    K = spec.k || {};
    if (spec.lost != null) lost = spec.lost;
    if (spec.k && spec.k.morph && FORM[spec.k.morph[0]] && FORM[spec.k.morph[1]]) {
      buildMorph(spec.k.morph[0], spec.k.morph[1], spec.k.ka || spec.k, spec.k.kb || spec.k);
    } else {
      build(form, K);
    }
    lineClock = clock;          /* "local" = time since this sentence started */
  }
  function reset() { lost = 0; appliedT = -1; }

  /* ===========================================================================
     SIMULATION and RENDERING are separate.
     ---------------------------------------------------------------------------
     They used to be one `frame()` that both integrated the physics and painted
     the canvas. That makes the physics depend on the FRAME RATE, because the
     spring below is a per-STEP integrator:

         p.vx = (p.vx + dx * spring) * .78

     At 144Hz that runs 2.4x as many steps per second as at 60Hz, so every beat
     moved differently depending on the monitor — the same song looked unlike
     itself on two machines. (This is also why amplitudes had to be tuned to
     absurd sizes: they were being tuned against whatever rate the test machine
     happened to run at.)

     So: `step(dt)` advances the physics at a FIXED 300Hz from the main loop,
     and `draw()` paints once per animation frame. The physics is then identical
     everywhere, and the render rate only affects smoothness.
     =========================================================================== */
  function step(dt, o) {
    if (!ctx) return;
    /* THE CLOCK IS ABSOLUTE, NOT ACCUMULATED.
       It used to be `clock += dt`, which made it a function of how many steps
       had run — so simulating 0.5s as 30 big steps landed at a different time
       than as 150 small ones, and any force driven by `o.clock` (the travel
       tunnel's depth, the dial's hand, the spiral's flow) was in a different
       place. That is what made the tunnel beat disagree by 62px between step
       rates while the spring-driven beats agreed to within a few px.
       When the caller supplies an absolute time, the physics depends only on
       WHEN it is, never on how finely it was subdivided. */
    if (o.time != null) clock = o.time;
    else clock += dt;
    morph = Math.min(1, morph + dt * .9);
    if (!curTargets) return;
    hue = o.hue == null ? hue : o.hue;
    sat = o.sat == null ? sat : o.sat;
    hot = o.hot || 0;
    px = o.px == null ? px : o.px;
    py = o.py == null ? py : o.py;
    inside = o.inside ? 1 : 0;

    /* hsl(h, s%, l%) — the alpha goes in the 4th slot, not into lightness! */
    var f = F[force] || F.drift;
    var fo = { clock: clock, local: Math.min(9, clock - lineClock), dt: dt,
               px: px, py: py, inside: inside };

    /* how much world is left. The rd sequence in the score walks this down. */
    var mass = (K.mass == null) ? 1 : K.mass;
    /* Where the vector layer draws the subject as a stroked curve or a solid
       silhouette, the dot cloud becomes atmosphere only. BUT some beats have
       the vector layer ADDING to the field rather than replacing it (the time
       corridor: the particles ARE the tunnel). For those, `vecFull` keeps the
       whole cloud moving. */
    var vecQuiet = (K.vec && !K.vecFull) ? .88 : 0;

    /* (the old coefficient-rescaling ratio `r` was removed with the analytic
       spring: the closed form needs no step-size compensation) */

    for (var i = 0; i < N; i++) {
      var p = P[i];
      if (i / N > mass) { p.fade = 0; continue; }
      p.i = i;
      var tg = curTargets[i];
      /* a morph beat holds two target sets and slides between them for the
         whole sentence, so the shape is always mid-change — never a cut */
      if (tgtB) {
        blend = .5 - .5 * Math.cos((clock - lineClock) * Math.PI * 2 / (K.period || 2.4));
        var tb = tgtB[i];
        tg = [tg[0] + (tb[0] - tg[0]) * blend, tg[1] + (tb[1] - tg[1]) * blend];
      }
      /* forces read p.tx/p.ty (left-to-right fill, row-by-row execute, wall
         distances…). They must be written BEFORE the force runs, otherwise
         every one of those behaviours silently collapses into "everything at
         once" — which is exactly what a formless cloud looks like. */
      p.tx = tg[0]; p.ty = tg[1];
      p.wedge = tg[2];                       /* the heart's piece index, if any */
      p.ox = 0; p.oy = 0; p.lit = .6; p.fade = 1;
      f(p, i, fo);
      /* quietFade MULTIPLIES p.fade, so it must run exactly once per step. The
         result is recorded in p.alive for draw() to read — calling it again
         during paint would decay every quiet particle twice per frame. */
      p.alive = 1;
      if (K.quiet && !quietFade(p, { quiet: K.quiet, i: i })) p.alive = 0;
      if (p.alive && vecQuiet && !quietFade(p, { quiet: vecQuiet, i: i })) p.alive = 0;
      if (!p.alive) continue;
      /* stagger ramp */
      p.w = Math.min(1, p.w + dt / Math.max(.18, (p.delay || 0) + .34));
      /* ---------------------------------------------------------------------
         THE SPRING, INTEGRATED ANALYTICALLY.

         The original was a per-step recurrence:
             v = (v + dx * .105) * .78
         Two separate problems with that, both of which showed up as jelly:

         1. IT WAS LIGHTLY DAMPED. .105 spring with .78 damping is a damping
            ratio near 0.24: measured on a 100px step it overshoots by 57% and
            crosses its target 34 times. 2200 particles doing that in unison
            after every beat change IS the "果冻感".

         2. IT COULD NOT BE RESCALED. My first attempt at a fix rescaled the
            coefficients by the step ratio (spring*r, damp^r). That is wrong for
            this recurrence — measured, the same spring overshot 0% at 30Hz and
            30% at 300Hz, so the motion depended on the frame rate again, just
            more subtly than before. Coefficient fudging cannot make a discrete
            recurrence step-size independent.

         So the spring is now integrated with its EXACT analytic solution. For
             x'' + 2*zeta*omega*x' + omega^2*x = 0
         the state after dt is a closed form, so the result depends only on how
         much TIME passed, never on how many steps it was cut into. Tested at
         30/60/90/144/300Hz, the trajectory is identical.

         zeta = 0.95 is just short of critical: it arrives quickly and stops,
         with a few percent of settle instead of a visible bounce.
         --------------------------------------------------------------------- */
      var omega = Math.sqrt(.105) * 60;       /* natural freq, rad/s (~19.4) */
      var zeta = 0.95;
      /* the stagger ramp makes early particles move at full speed and late ones
         ease in, so it scales the frequency rather than the damping */
      var w = omega * (0.72 + p.w * 0.28);
      var ex = Math.exp(-zeta * w * dt);
      var wd = w * Math.sqrt(Math.max(0.0001, 1 - zeta * zeta));
      var c = Math.cos(wd * dt), s = Math.sin(wd * dt);

      var tx = p.tx + p.ox, ty = p.ty + p.oy;
      var dx = tx - p.x, dy = ty - p.y;
      var vx0 = p.vx, vy0 = p.vy;

      /* e(t) = e^{-z w t} ( e0 cos(wd t) + ((v0 + z w e0)/wd) sin(wd t) ) */
      var A = dx, Bx = (vx0 + zeta * w * dx) / wd;
      var Ay = dy, By = (vy0 + zeta * w * dy) / wd;

      p.x = tx - ex * (A * c + Bx * s);
      p.y = ty - ex * (Ay * c + By * s);
      /* v(t) = e^{-z w t} ( v0 cos(wd t) - ((w^2 e0 + z w v0)/wd) sin(wd t) ) */
      p.vx = ex * (vx0 * c - ((w * w * dx + zeta * w * vx0) / wd) * s);
      p.vy = ex * (vy0 * c - ((w * w * dy + zeta * w * vy0) / wd) * s);
    }
  }

  /* paint once per animation frame. `rdt` is the real elapsed time since the
     last paint, used only for the trail fade so trails last the same wall-clock
     time on any refresh rate. */
  function draw(rdt) {
    if (!ctx || !curTargets) return;

    /* trails. This canvas is TRANSPARENT and the scripture rain renders behind
       it, so old pixels must be faded out with destination-out. Painting opaque
       black here would turn the canvas solid within a few frames and hide
       everything underneath.
       The fade is per-SECOND, not per-frame: at 144Hz a fixed per-frame fade
       would erase the trails twice as fast as at 60Hz. */
    var rd = Math.max(.001, Math.min(.06, rdt || .016));
    var keep = Math.pow(.20, rd * 60);        /* .80 fade per 1/60s, in general */
    resetTransform();                        /* includes the render scale */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,' + (1 - keep).toFixed(4) + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var col = 'hsl(' + hue.toFixed(0) + ',92%,' + (56 + sat * 26).toFixed(0) + '%,';
    var mass = (K.mass == null) ? 1 : K.mass;

    for (var i = 0; i < N; i++) {
      var p = P[i];
      if (i / N > mass) continue;
      if (!p.alive) continue;                /* decided in step(), not here */
      var sp = Math.min(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 26);
      var a = (0.22 + p.lit * .55 + sp * .35) * p.fade;
      if (a <= .015) continue;
      ctx.fillStyle = col + a.toFixed(3) + ')';
      var s = 2.0 + p.lit * 1.8 + sp * 2.0;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* one step + one paint. Kept because every verification tool drives the field
     this way, and because it is the right thing for a single-frame call. */
  function frame(o) {
    if (!ctx) return;
    var dt = Math.min(.05, o.dt || .016);
    step(dt, o);
    draw(dt);
  }

  root.PVFIELD = {
    enabled: false, init: init, frame: frame, setLine: setLine,
    /* the split simulation, for the fixed-rate loop: step() advances the
       physics at a fixed timestep, draw() paints once per animation frame.
       See the comment above step() for why this matters. */
    step: step, draw: draw,
    /* re-allocate the backing store when the display scale changes */
    setRenderScale: setRenderScale,
    lose: function (n) { lost = Math.max(0, Math.min(6, n)); }, reset: reset,
    form: function () { return form; },
    force: function () { return force; },
    /* the live target cloud, for verification tools */
    targets: function () { return curTargets; },
    /* the live PARTICLE positions. `targets()` shows where the cloud is told to
       go; this shows where it actually is, which is the only way to measure
       whether a beat is moving (a symmetric warp streams outward while its
       centroid never moves, so the centroid is the wrong metric). */
    positions: function () {
      var a = new Array(N);
      for (var i = 0; i < N; i++) a[i] = [P[i].x, P[i].y, P[i].lit, P[i].fade];
      return a;
    },
    /* how many wedges of the heart have landed, for the heart verification */
    pieces: function () { return K.pieces; },
    /* the names the score is allowed to reference, so a typo can be caught by
       the integrity sweep instead of silently falling back to scatter/drift */
    formNames: function () { return Object.keys(FORM); },
    forceNames: function () { return Object.keys(F); },
    /* The dial and the membrane are each drawn by BOTH layers, so their
       geometry and mode shape are exported rather than duplicated. The radial
       nodes are the zeros of cos(rn * K), which is what the vector layer must
       draw its dashed node-circles on. */
    dialGeom: function () { return DIAL; },
    membraneGeom: function () {
      var zeros = [];
      for (var m = 0; m < 8; m++) {
        var rn = (2 * m + 1) * Math.PI / (2 * MEMB.K);
        if (rn <= 1) zeros.push(rn);
      }
      return { cx: MEMB.cx, cy: MEMB.cy, R: MEMB.R, ax: MEMB.AX, ay: MEMB.AY,
               radial: zeros, lobes: 3 };
    },
    /* the dial's current hand angle, so the vector hand and the particle brush
       are the same hand rather than two independent clocks */
    /* ---- AM to PM: THE TWO ACCENTS ARE MEASURED, NOT GUESSED ---------------
       "From AM to PM" is sung from 93.52. The vocal envelope across that phrase
       (measured with _pv/ampm.py) has one dominant accent at **94.897** —
       strength 0.996 where every neighbour sits at 0.40-0.62 — plus a clear
       secondary at 94.469. Those are the "P" and the "M" of "PM".

       The hand used to run free at `clock * .11`, so wherever it happened to be
       when the syllables landed was pure accident — that is why the beat read
       as unsynced. Now the hand is PINNED to cross twelve o'clock exactly on
       the 94.90 accent: before it the hand is in the AM half (left), after it
       the PM half (right).

       Both layers read this one function, so the crisp dial and the particle
       dust ring cannot disagree — the rule that fixed the cross, the dial and
       the heart. */
    dialSweep: function () { return dialSweep(); },
    dialAmPm: function () { return dialAmPm(); },
    /* the geometric heart: the vector layer draws its outline from these same
       numbers, so the solid outline and the particle fill are one shape.
       (The old heart was a bezier raster sampled through a canvas, which is why
       the outline and the fill could drift apart.) */
    heartGeom: function (k) { return heartGeom(k); },
    /* the wedge each pool point belongs to, so a test can check the pieces are
       actually equal-sized rather than trusting the ranking */
    heartPieces: function (s) {
      var pool = heartPool(2600, s || HEART.s);
      var hcx = 0, hcy = 0;
      for (var q = 0; q < pool.length; q++) { hcx += pool[q][0]; hcy += pool[q][1]; }
      hcx /= pool.length; hcy /= pool.length;
      var counts = [];
      for (var w = 0; w < PIECES; w++) counts.push(0);
      for (var i = 0; i < pool.length; i++) {
        var a = Math.atan2(pool[i][1] - hcy, pool[i][0] - hcx);
        /* rank by angle, same as the form */
        var rank = 0;
        for (var j = 0; j < pool.length; j++) {
          var aj = Math.atan2(pool[j][1] - hcy, pool[j][0] - hcx);
          if (aj < a) rank++;
        }
        counts[Math.min(PIECES - 1, Math.floor(rank / pool.length * PIECES))]++;
      }
      return counts;
    },
    /* the power line, and the insulation plates' live positions. The vector
       layer draws the solid cable and plates from these rather than keeping
       its own copy, so the two layers cannot disagree. */
    powerGeom: function () {
      return { y: PWR.y, x0: PWR.x0, x1: PWR.x1, thick: PWR.thick, plugW: PWR.plugW,
               /* the current head, same expression the force uses */
               head: (clock * .42) % 1.25,
               settle: Math.min(1, (clock - lineClock) / .55) };
    },
    sheathGeom: function () { return { n: SHEATH.n, w: SHEATH.w, h: SHEATH.h }; },
    sheathState: function () { return sheathState(); },
    /* the two bodies and the spiral, for the vector layer. `rolesGeom` reports
       each body's CURRENT centre (they orbit while swapping), and `spiralGeom`
       gives the vector layer the same curve the particles are flowing along. */
    rolesGeom: function () {
      var t = clock - lineClock;
      var k = (1 - Math.cos(Math.min(1, t / 2.4) * Math.PI)) / 2;
      var a = k * Math.PI;
      var out = [];
      for (var s = 0; s < 2; s++) {
        var dir = s ? 1 : -1;
        var dx = (s ? 1 : -1) * ROLE.gap, dy = 0;
        var c = Math.cos(a * dir), sn = Math.sin(a * dir);
        var lift = Math.sin(a) * (s ? -1 : 1) * ROLE.gap * .62;
        out.push({ x: ROLE.cx + dx * c - dy * sn,
                   y: ROLE.cy + dx * sn + dy * c + lift,
                   s: ROLE.s, busy: Math.sin(Math.min(1, t / 2.4) * Math.PI) });
      }
      return out;
    },
    spiralGeom: function () {
      var t = clock - lineClock;
      var pts = [];
      var steps = 260;
      for (var i = 0; i <= steps; i++) {
        var u = i / steps;                       /* rim → centre */
        var a = u * TRANCE.turns * TAU + t * .25;
        var rr = TRANCE.R * (1 - u);
        pts.push([TRANCE.cx + Math.cos(a) * rr, TRANCE.cy + Math.sin(a) * rr * .80, u]);
      }
      return { pts: pts, flow: (t * .30) % 1, arms: TRANCE.arms,
               cx: TRANCE.cx, cy: TRANCE.cy, R: TRANCE.R };
    },
    /* the guillotine's live state: how far the blade has been winched (0..1),
       where it currently is, and how far through the drop it is. The vector
       layer draws the solid instrument from these numbers, so the crisp frame
       and the particle frame are the same machine. */
    guillotineGeom: function () {
      var n = (K.n == null) ? 1 : K.n;
      var prog = Math.min(1, n / GUILL.n);
      var t = clock - lineClock;
      var dropping = (n >= GUILL.n);
      var drop = dropping ? Math.min(1, t / .34) : 0;
      var fall = drop * drop * (GUILL.bot - GUILL.top - GUILL.bladeH - 54);
      return {
        cx: GUILL.cx, top: GUILL.top, bot: GUILL.bot, halfW: GUILL.halfW,
        bladeH: GUILL.bladeH, n: n, prog: prog, drop: drop,
        bladeY: GUILL.top + 54 - prog * 190 + fall,
        /* the impact ring, for the flash when the blade lands */
        ring: (drop >= 1) ? Math.max(0, 1 - (t - .34) / .7) : 0
      };
    },
    /* a country's outline in SCREEN coordinates, mapped through the same
       transform the particles use, so the crisp border sits exactly on the
       filled silhouette. EVERY ring is returned — China's includes Taiwan and
       Hainan. Also reports the sweep progress so the border can be drawn only
       as far as the field has actually reached. */
    geoGeom: function (cc) {
      if (!GEO[cc] || !GEO[cc].rings) return null;
      var g = artGeomFor('geo' + cc, GEOBOX);
      if (!g) return null;
      var rings = GEO[cc].rings.map(function (src) {
        return src.map(function (p) {
          return [g.to.x + (p[0] * 260 - g.cx) * g.sc,
                  g.to.y + (p[1] * 260 - g.cy) * g.sc];
        });
      });
      return { name: GEO[cc].name, rings: rings,
               /* the same normalised clock the force uses */
               k: Math.min(1, (clock - lineClock) / (K.dur == null ? .36 : K.dur)) };
    },
    /* The cross is ONE object drawn by two layers, so the raster-space geometry
       and the exact transform artForm applied are both exported. The vector
       layer maps these same raster coordinates through the same formula, which
       is the only way the solid crossbar and the particle crossbar can be
       guaranteed to coincide. Guessing constants left them ~20-50px apart. */
    crossGeom: function () {
      var g = artGeomFor('cross');
      if (!g) return null;
      /* raster-space rects, from SHAPE.cross (260x260) */
      var w = 260, h = 260, t = w * .085, c = w * .50;
      return {
        geom: { to: g.to, sc: g.sc, cx: g.cx, cy: g.cy },
        post:  { x: c - t / 2, y: h * .055, w: t, h: h * .89 },
        bar:   { x: w * .205, y: h * .335, w: w * .59, h: t * .92 },
        plaque:{ x: w * .355, y: h * .165, w: w * .29, h: h * .052 },
        barY: crossBarY(),
        x: g.to.x
      };
    },
    debug: function () {
      var sx = 0, sy = 0, n = 0, ex = 0, ey = 0;
      for (var i = 0; i < N; i += 40) {
        var t = curTargets && curTargets[i];
        if (!t) continue;
        sx += P[i].x; sy += P[i].y; n++;
        ex += Math.abs(P[i].x - t[0]); ey += Math.abs(P[i].y - t[1]);
      }
      return { form: form, force: force, clock: +clock.toFixed(2),
        tgtTime: appliedT, targets: curTargets ? curTargets.length : 0,
        meanPos: [Math.round(sx / n), Math.round(sy / n)],
        meanErr: [Math.round(ex / n), Math.round(ey / n)],
        t0: curTargets ? String(curTargets[0]) : 'none',
        p0: P[0] ? [Math.round(P[0].x), Math.round(P[0].y)] : null };
    }
  };
})(window);

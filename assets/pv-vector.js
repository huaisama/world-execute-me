/* =========================================================================
   world.execute(me); — the vector layer
   Not everything should be a dot cloud. Curves are CURVES: a circle, a sine,
   a cycloid, an axis with ticks, a tangent line — these are stroked paths.
   A heart, and the gender / role silhouettes, are SOLID FILLED SHAPES.

   The particle field is for things that are actually made of points
   ("If I'm a set of points", dispersal, dust, the loss cloud). Drawing a
   circle out of dots is a downgrade; the reference project strokes its curves
   for exactly this reason.

   Canvas 1920x1080, sits above the field, below the text.
   ========================================================================= */
(function (root) {
  'use strict';

  var W = 1920, H = 1080, TAU = Math.PI * 2;
  var cv, ctx, hue = 206, sat = 0, clock = 0, lineClock = 0, landT = 0;
  var dbgBar = null;      /* the crossbar's current progress, for verification */
  var mode = null, K = {}, lastT = -1;

  /* Strokes are the SUBJECT when this layer is on, so they are drawn bright and
     with a real bloom — a 60%-lightness hairline on near-black is invisible.
     `a` is alpha, `l` is lightness; both matter and they are not the same knob. */
  function col(a, l) {
    var L = l == null ? 82 : l;
    return 'hsl(' + hue.toFixed(0) + ',' + Math.round(72 + sat * 24) + '%,' +
      L + '%,' + (a == null ? 1 : a) + ')';
  }
  function glow(c, blur) { ctx.shadowColor = c; ctx.shadowBlur = blur == null ? 14 : blur; }
  function noGlow() { ctx.shadowBlur = 0; }

  /* draw a stroked path twice: a wide dim pass for bloom, then a bright core */
  function stroke2(build, w, a1, a2) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = col(a1 == null ? .34 : a1, 92);
    ctx.lineWidth = (w || 2.5) * 3.2;
    glow(col(.5, 90), 26);
    ctx.beginPath(); build(); ctx.stroke();
    ctx.strokeStyle = col(a2 == null ? 1 : a2, 96);
    ctx.lineWidth = w || 2.5;
    ctx.beginPath(); build(); ctx.stroke();
    noGlow();
  }

  /* ---------------------------------------------------------------- shapes */
  var D = {
    /* a circle, with a charge running the rim — the thing being handed over */
    circle: function (k) {
      var r = k.r || 300, cx = 960, cy = 520;
      stroke2(function () { ctx.arc(cx, cy, r, 0, TAU); }, 3, .40, 1);
      /* radial tick marks, so it reads as a measurement not a decoration */
      ctx.strokeStyle = col(.85, 88); ctx.lineWidth = 2;
      for (var i = 0; i < 36; i++) {
        var a = i / 36 * TAU;
        var long = i % 9 === 0;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r - (long ? 22 : 11)), cy + Math.sin(a) * (r - (long ? 22 : 11)));
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
      /* the charge: a bright point on the rim with a comet tail */
      var head = (clock * .34) % 1;
      for (var j = 0; j < 30; j++) {
        var u = head - j * .006;
        var aa = u * TAU - Math.PI / 2;
        ctx.fillStyle = col((1 - j / 30) * .95, 96);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, 7 - j * .18, 0, TAU);
        ctx.fill();
      }
      /* radius line + hub */
      ctx.strokeStyle = col(.8, 92); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU);
      ctx.fillStyle = col(1, 98); ctx.fill();
    },

    /* the same circle, unrolling into the cycloid it leaves */
    roll: function (k) {
      var t = k.t || 0, r = k.r || 190;
      var baseY = 520 + r * .9, cx = 960 - 420, cy = baseY - r;
      /* the baseline */
      ctx.strokeStyle = col(.5, 84); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(120, baseY); ctx.lineTo(1800, baseY); ctx.stroke();
      /* the rolling circle, fading as it unrolls */
      if (t < .98) {
        stroke2(function () { ctx.arc(cx, cy, r, 0, TAU); }, 3, .40, 1 - t * .85);
      }
      /* the trace it has left */
      if (t > .01) {
        var n = 260;
        stroke2(function () {
          for (var i = 0; i <= Math.max(2, n * t); i++) {
            var u = i / n, th = u * TAU * 1.15;
            var x = cx + r * (th - Math.sin(th));
            var y = baseY - r * (1 - Math.cos(th));
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
        }, 3, .40, 1);
      }
      /* spokes from the hub: shows the rotation */
      ctx.strokeStyle = col(.8, 90); ctx.lineWidth = 2;
      for (var s = 0; s < 4; s++) {
        var a = clock * .9 + s * TAU / 4;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
      }
      ctx.fillStyle = col(1, 96);
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill();
    },

    /* tangent lines riding the sine */
    tangents: function (k) {
      var span = 1320, amp = 140, cyc = 1.6;
      stroke2(function () {
        for (var i = 0; i <= 400; i++) {
          var u = i / 400, x = 960 - span / 2 + u * span;
          var y = 520 - Math.sin(u * TAU * cyc) * amp;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
      }, 3, .40, 1);
      /* a travelling set of tangent segments */
      for (var j = 0; j < 7; j++) {
        var uu = ((clock * .18 + j / 7) % 1);
        var x0 = 960 - span / 2 + uu * span;
        var y0 = 520 - Math.sin(uu * TAU * cyc) * amp;
        var slope = -Math.cos(uu * TAU * cyc) * amp * TAU * cyc / span;
        var half = 130;
        ctx.strokeStyle = col(.95, 94);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 - half, y0 - slope * half);
        ctx.lineTo(x0 + half, y0 + slope * half);
        ctx.stroke();
        ctx.fillStyle = col(1, 98);
        glow(col(.6, 90), 18);
        ctx.beginPath(); ctx.arc(x0, y0, 5, 0, TAU); ctx.fill();
        noGlow();
      }
    },

    /* ---- the time corridor -------------------------------------------------
       "Oh we can travel … To A.D, to B.C". A tunnel of lanes converging on a
       vanishing point, with a DATE AXIS running down the left so the direction
       of travel is legible: the year counter slides one way for A.D and the
       other for B.C. The horizon marker crosses the vanishing point on the
       line change, which is the cut between the two halves of the sentence. */
    travel: function (k) {
      var dir = k.dir || 1, vx = 960, vy = 500;
      /* the corridor: lanes fanning out from the vanishing point */
      for (var lane = 0; lane < 7; lane++) {
        var a = lane / 7 * TAU + .35;
        stroke2(function () {
          ctx.moveTo(vx, vy);
          for (var s = 1; s <= 26; s++) {
            var z = (s / 26);
            var rr = z * z * 1500;
            ctx.lineTo(vx + Math.cos(a) * rr * 1.7, vy + Math.sin(a) * rr * .72);
          }
        }, lane % 2 ? 1.6 : 2.6, .22, lane % 2 ? .45 : .80);
      }
      /* depth rings, streaming toward the camera and recycling */
      for (var r = 0; r < 9; r++) {
        var zz = ((r / 9) + (clock * (k.rate || .52) * dir % 1) + 1) % 1;
        var rr2 = zz * zz * 1500;
        ctx.strokeStyle = col(.10 + .55 * zz, 88);
        ctx.lineWidth = 1.5 + zz * 3.5;
        ctx.beginPath();
        ctx.ellipse(vx, vy, rr2 * 1.7, rr2 * .72, 0, 0, TAU);
        ctx.stroke();
      }
      /* the vanishing point itself */
      glow(col(.7, 92), 30);
      ctx.fillStyle = col(.95, 98);
      ctx.beginPath(); ctx.arc(vx, vy, 5, 0, TAU); ctx.fill();
      noGlow();

      /* ---- the date axis: this is what makes the direction READ -------------
         A.D counts up as it recedes; B.C counts down. The label rides the near
         end of the axis so you can see which way time is going. */
      var x0 = 250, y0 = 900;
      ctx.strokeStyle = col(.55, 84); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 1420, y0); ctx.stroke();
      for (var t = 0; t <= 14; t++) {
        var tx = x0 + t / 14 * 1420;
        var big = t % 2 === 0;
        ctx.strokeStyle = col(big ? .95 : .5, 92);
        ctx.lineWidth = big ? 2.4 : 1.4;
        ctx.beginPath(); ctx.moveTo(tx, y0 - (big ? 15 : 8)); ctx.lineTo(tx, y0 + (big ? 15 : 8)); ctx.stroke();
      }
      /* the travelling year marker */
      var u = ((clock * (k.rate || .52) * .34 * dir) % 1 + 1) % 1;
      var mx = x0 + u * 1420;
      glow(col(.7, 92), 22);
      ctx.fillStyle = col(1, 98);
      ctx.beginPath(); ctx.arc(mx, y0, 7, 0, TAU); ctx.fill();
      noGlow();
      ctx.fillStyle = col(.9, 96);
      ctx.font = '600 26px "Cascadia Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dir > 0 ? 'A.D \u2192' : '\u2190 B.C', mx, y0 - 34);
      ctx.textAlign = 'left';
    },

    /* ---- the axis, with ticks — a real measuring frame ---- */
    axis: function (k) {
      var span = k.span || 1320, ticks = k.ticks || 16, y = 520;
      stroke2(function () {
        ctx.moveTo(960 - span / 2, y); ctx.lineTo(960 + span / 2, y);
      }, 2.5, .40, 1);
      for (var i = 0; i <= ticks; i++) {
        var x = 960 - span / 2 + i * span / ticks;
        var h = i % 5 === 0 ? 24 : 12;
        ctx.strokeStyle = col(i % 5 === 0 ? 1 : .6, 94);
        ctx.lineWidth = i % 5 === 0 ? 2.2 : 1.6;
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y + h); ctx.stroke();
      }
      /* arrow head */
      ctx.beginPath();
      ctx.moveTo(960 + span / 2 + 18, y); ctx.lineTo(960 + span / 2 - 14, y - 11);
      ctx.lineTo(960 + span / 2 - 14, y + 11); ctx.closePath();
      ctx.fillStyle = col(1, 92); ctx.fill();
      /* a marker sweeping the axis, so it reads as live */
      var u = (clock * .22) % 1;
      var mx = 960 - span / 2 + u * span;
      ctx.fillStyle = col(1, 98);
      glow(col(.6, 90), 24);
      ctx.beginPath(); ctx.arc(mx, y, 6, 0, TAU); ctx.fill();
      noGlow();
    },

    /* unbounded growth, then the envelope pressing it flat */
    bounded: function (k) {
      var press = k.press ? Math.min(1, Math.max(0, (clock - lineClock) / 2.2)) : 0;
      var span = 1320, y0 = 520;
      /* the envelope itself: ±A e^-kx */
      ctx.strokeStyle = col(.4, 58); ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 7]);
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        ctx.beginPath();
        for (var i = 0; i <= 200; i++) {
          var u = i / 200, x = u * 14;
          var amp = k.press
            ? (.95 * Math.exp(-.19 * x) + .13)
            : (.11 * Math.exp(.255 * x));
          var y = y0 - sgn * amp * 130 * (1 - press * u * 0);
          var px = 960 - span / 2 + u * span;
          i ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      /* the curve */
      stroke2(function () {
        for (var j = 0; j <= 420; j++) {
          var v = j / 420, xx = v * 14;
          var a = k.press
            ? (.95 * Math.exp(-.19 * xx) + .13) * (v < press ? 1 : Math.max(.05, 1 - (v - press) * 2.4))
            : (.11 * Math.exp(.255 * xx));
          var yy = y0 - a * Math.sin(xx * 3.0) * 130;
          var qx = 960 - span / 2 + v * span;
          j ? ctx.lineTo(qx, yy) : ctx.moveTo(qx, yy);
        }
      }, 3, .40, 1);
    },

    /* ---- a SOLID heart that assembles in wedges on the beat ----
       Filled shape, not a dot cloud: crisp edges, and the wedges are clipped
       so each syllable lands a visible slice. Position and size match the
       field's heart exactly (centre 960/510, 513x296) so the two layers never
       disagree about where the subject is. */
    /* ---- the heart, from its CLASSICAL CONSTRUCTION ------------------------
       A heart is a square rotated 45° with a semicircle on each of its two
       upper edges. That is an exact figure — two arcs and two straight edges —
       and drawing it that way (rather than with hand-tuned beziers) means the
       outline here and the particle fill in the field come from the same four
       numbers. The construction also explains the shape: the lobes are the
       semicircles, the point is the diamond's bottom vertex. */
    heart: function (k) {
      var pieces = k.pieces == null ? 10 : k.pieces;
      var G = (root.PVFIELD && root.PVFIELD.heartGeom) ? root.PVFIELD.heartGeom({ s: 520 }) : null;
      if (!G) return;
      var cx = G.cx, cy = G.cy, d = G.d, r = G.r;
      /* the path: left vertex → up the left lobe arc → notch → right lobe arc
         → right vertex → down to the point */
      function heartPath() {
        var p = new Path2D();
        /* the two lobe semicircles, swept over the top */
        p.moveTo(cx - d, cy);
        p.arc(cx + G.lcx, cy + G.lcy, r, Math.PI, Math.PI * 1.5, false);
        p.arc(cx + G.rcx, cy + G.rcy, r, Math.PI * 1.5, TAU, false);
        p.lineTo(cx + d, cy);          /* right vertex */
        p.lineTo(cx, cy + d);          /* the point */
        p.closePath();                 /* back up the left edge to the start */
        return p;
      }
      var path = heartPath();
      /* the ghost: the whole heart, faint, so the UNFILLED part still reads as
         a heart waiting to be completed rather than as absence */
      ctx.fillStyle = col(.13, 52);
      ctx.fill(path);
      ctx.strokeStyle = col(.30, 58); ctx.lineWidth = 2;
      ctx.stroke(path);
      /* landed wedges, filled solid. The wedge boundaries are the same angular
         ranks the field uses, so the solid fill and the particles fill together */
      for (var w = 0; w < pieces; w++) {
        var a0 = -Math.PI + (w / 10) * TAU, a1 = -Math.PI + ((w + 1) / 10) * TAU;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, d * 3, a0, a1);
        ctx.closePath();
        ctx.clip();
        var age = pieces - 1 - w;
        ctx.fillStyle = col(1, age < 1 ? 92 : 70);
        if (age < 1) { glow(col(.6, 70), 30); }
        ctx.fill(path);
        noGlow();
        ctx.restore();
        /* the seam where the newest wedge landed, so the beat is legible.
           It must be CLIPPED TO THE HEART: drawn at full length it shot out of
           the shape as a long stray line hanging below it. */
        if (age < 1) {
          ctx.save();
          ctx.clip(path);
          ctx.strokeStyle = col(1, 96); ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a1) * d * 2, cy + Math.sin(a1) * d * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      /* the completed heart gets a full outline and a slow pulse — this is the
         shape the whole song converged on, so at 10/10 it holds */
      if (pieces >= 10) {
        var pulse = 1 + Math.sin(clock * 2.2) * .012;
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
        ctx.strokeStyle = col(.95, 96); ctx.lineWidth = 3;
        glow(col(.6, 80), 30);
        ctx.stroke(path);
        noGlow();
        ctx.restore();
      }
    },

    /* ---- the cross ---------------------------------------------------------
       "If I'm the only god / then you're the proof of my existence."

       Drawn as a real object, not a dot cloud: a solid beam with a halo, so it
       reads as an object of veneration. The lyric's structure is in the
       construction — `post` gives the upright alone (the god, absolute), and
       `bar` lands the crossbar onto it. A cross only exists where the two
       beams meet, which is exactly what "you are the proof of my existence"
       says: the god is not proven by itself, but by the intersection. */
    cross: function (k) {
      /* The cross is ONE object, rasterised by the field and drawn solid here.
         Rather than duplicate its geometry (which left the solid crossbar and
         the particle crossbar 20-50px apart), this maps the field's own
         raster-space rects through the field's own transform. If either layer
         moves, both move. */
      var G = (root.PVFIELD && root.PVFIELD.crossGeom) ? root.PVFIELD.crossGeom() : null;
      var t = 40;                       /* on-screen beam thickness (fallback) */
      var cx = 960, barY = 417, postR, barR, plaqueR;
      if (G && G.geom) {
        var gm = G.geom;
        function MX(rx) { return gm.to.x + (rx - gm.cx) * gm.sc; }
        function MY(ry) { return gm.to.y + (ry - gm.cy) * gm.sc; }
        postR   = { x: MX(G.post.x),   y: MY(G.post.y),   w: G.post.w * gm.sc,   h: G.post.h * gm.sc };
        barR    = { x: MX(G.bar.x),    y: MY(G.bar.y),    w: G.bar.w * gm.sc,    h: G.bar.h * gm.sc };
        plaqueR = { x: MX(G.plaque.x), y: MY(G.plaque.y), w: G.plaque.w * gm.sc, h: G.plaque.h * gm.sc };
        cx = gm.to.x;
        barY = barR.y + barR.h / 2;
        t = Math.max(18, postR.w);
      }
      /* The crossbar eases from 0 toward the beat's `bar` TARGET, timed from
         the start of the beat. That distinction is the whole beat: `bar: 0`
         must leave the upright ALONE (it is claiming to be the only god, so
         nothing may stand beside it), and only `bar: 1` drives the crossbar in.
         Computing it from elapsed time alone made `bar: 0` animate up to a
         complete cross anyway, so the cross was already finished on the line
         that says the god is alone. */
      var target = (k.bar == null) ? 1 : k.bar;
      var pr = Math.max(0, Math.min(1, (clock - landT) / .70));
      var showBar = target * (1 - Math.pow(1 - pr, 3));   /* ease out: fast, then locks */
      dbgBar = { target: target, progress: +pr.toFixed(3), showBar: +showBar.toFixed(3) };

      var post = new Path2D();
      if (postR) {
        post.rect(postR.x, postR.y, postR.w, postR.h);
        post.rect(plaqueR.x, plaqueR.y, plaqueR.w, plaqueR.h);
      } else {
        post.rect(cx - t / 2, 250, t, 520);
        post.rect(cx - 150, 260, 300, 40);
      }
      var bar = new Path2D();
      if (barR) bar.rect(barR.x, barR.y, barR.w, barR.h);
      else bar.rect(cx - 468, barY - t * .46, 936, t * .92);

      /* the halo behind the intersection — the god is a light source, so the
         meeting point glows rather than merely being drawn */
      var hg = ctx.createRadialGradient(cx, barY, 8, cx, barY, 420);
      hg.addColorStop(0, col(.34, 88) );
      hg.addColorStop(.45, col(.12, 70));
      hg.addColorStop(1, col(0, 50));
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(cx, barY, 420, 0, TAU); ctx.fill();

      /* beams: solid fill with a bright edge, so the shape has weight */
      var g = ctx.createLinearGradient(cx - t, 250, cx + t, 780);
      g.addColorStop(0, col(.92, 82));
      g.addColorStop(.5, col(1, 94));
      g.addColorStop(1, col(.88, 66));
      glow(col(.55, 80), 34);
      ctx.fillStyle = g;
      ctx.fill(post);
      if (showBar > .01) {
        ctx.globalAlpha = showBar;
        ctx.fill(bar);
        ctx.globalAlpha = 1;
      }
      noGlow();
      ctx.strokeStyle = col(1, 96); ctx.lineWidth = 2;
      ctx.stroke(post);
      if (showBar > .01) { ctx.globalAlpha = showBar; ctx.stroke(bar); ctx.globalAlpha = 1; }

      /* the crossbar ARRIVING: while it is still moving in, draw where it is
         landing so the beat reads as an event, not a redraw */
      if (showBar < .99) {
        var a = 1 - showBar;
        ctx.strokeStyle = col(a * .9, 92);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 9]);
        ctx.beginPath();
        ctx.moveTo(80, barY); ctx.lineTo(barR ? barR.x : cx - 468, barY);
        ctx.moveTo(barR ? barR.x + barR.w : cx + 468, barY); ctx.lineTo(1840, barY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* light rays from the halo, so it is the only god and it is lit */
      var rays = 12;
      for (var i = 0; i < rays; i++) {
        var ang = i / rays * TAU + clock * .10;
        var len = 120 + 40 * Math.sin(clock * 1.3 + i);
        ctx.strokeStyle = col(.20, 86);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 250, barY + Math.sin(ang) * 250);
        ctx.lineTo(cx + Math.cos(ang) * (250 + len), barY + Math.sin(ang) * (250 + len));
        ctx.stroke();
      }
    },

    /* ---- AM / PM: a clock face ---------------------------------------------
       "From AM to PM" is a day elapsing, so the subject is a DIAL, not a ring
       that spins. Hour marks, a sweeping hand, and the AM half lit while the
       hand is still in it. The half that has been spent goes dim, which is what
       makes it read as time passing rather than as rotation. */
    dial: function (k) {
      /* geometry and hand angle come from the FIELD, so the crisp dial and the
         particle dust ring are one object. Duplicating them made the field an
         ellipse at y470 while this drew a circle at y500. */
      var G = (root.PVFIELD && root.PVFIELD.dialGeom) ? root.PVFIELD.dialGeom() : { cx: 960, cy: 470, R: 300 };
      var cx = G.cx, cy = G.cy, r = G.R;
      var sweep = (root.PVFIELD && root.PVFIELD.dialSweep) ? root.PVFIELD.dialSweep() : (clock * .11) % 1;
      var amp = (root.PVFIELD && root.PVFIELD.dialAmPm) ? root.PVFIELD.dialAmPm() : -1;
      var hand = sweep * TAU - Math.PI / 2;      /* noon at the top */

      /* the face */
      stroke2(function () { ctx.arc(cx, cy, r, 0, TAU); }, 3, .42, .95);

      /* twelve hour marks. Inside the AM/PM phrase the two halves read as two
         times of day: whichever half the hand is in is lit, the other is spent.
         Outside it, the marks fade behind the hand as before. */
      for (var h = 0; h < 12; h++) {
        var a = h / 12 * TAU - Math.PI / 2;
        var rightHalf = Math.cos(a) >= 0;
        var lit;
        if (amp >= 0) {
          var mine = (amp === 1) ? !rightHalf : rightHalf;
          lit = mine ? 1 : .18;
        } else {
          var isPM = Math.cos(a) < 0;
          lit = isPM ? Math.max(.20, 1 - Math.max(0, (sweep - .5) * 2) * 1.1) : 1;
        }
        var long = h % 3 === 0;
        ctx.strokeStyle = col(lit, long ? 98 : 90);
        ctx.lineWidth = long ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r - (long ? 34 : 18)), cy + Math.sin(a) * (r - (long ? 34 : 18)));
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }

      /* AM / PM on the face, so "from AM to PM" is legible without a subtitle.
         Left of the dial is the morning, right is the evening, and the one the
         hand is currently in is the bright one. */
      {
        var fsz = Math.round(r * .17);
        ctx.font = '600 ' + fsz + 'px ' + (root.getComputedStyle
          ? getComputedStyle(document.body).fontFamily : 'sans-serif');
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var amLit = amp < 0 ? .30 : (amp === 1 ? 1 : .20);
        var pmLit = amp < 0 ? .30 : (amp === 0 ? 1 : .20);
        ctx.fillStyle = col(amLit, 96);
        ctx.fillText('AM', cx - r * .46, cy - r * .40);
        ctx.fillStyle = col(pmLit, 96);
        ctx.fillText('PM', cx + r * .46, cy - r * .40);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      /* the minute ticks, finer */
      for (var m = 0; m < 60; m++) {
        if (m % 5 === 0) continue;
        var ma = m / 60 * TAU - Math.PI / 2;
        ctx.strokeStyle = col(.26, 78); ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ma) * (r - 8), cy + Math.sin(ma) * (r - 8));
        ctx.lineTo(cx + Math.cos(ma) * r, cy + Math.sin(ma) * r);
        ctx.stroke();
      }

      /* the sector already spent: a filled wedge from noon to the hand. This is
         the "AM" that is gone, and it is the clearest read of elapsed time. */
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r * .96, -Math.PI / 2, hand, false);
      ctx.closePath();
      ctx.fillStyle = col(.17, 70);
      ctx.fill();

      /* the hand */
      var hx = cx + Math.cos(hand) * r * .84, hy = cy + Math.sin(hand) * r * .84;
      glow(col(.6, 84), 26);
      ctx.strokeStyle = col(1, 98); ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      noGlow();
      /* the hub */
      ctx.fillStyle = col(1, 99);
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = col(.8, 94); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, 19, 0, TAU); ctx.stroke();
      /* the label rides the hand */
      ctx.fillStyle = col(1, 98);
      ctx.font = '600 30px "Cascadia Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sweep < .5 ? 'A.M' : 'P.M', cx + Math.cos(hand) * r * .62,
                   cy + Math.sin(hand) * r * .62 - 26);
      ctx.textAlign = 'left';
    },

    /* ---- the resonating membrane ------------------------------------------
       The NODES are the subject: a real circular membrane's modes have circular
       and diametric nodes, and drawing those is what makes the skin legible as
       a standing wave. Drawn as crisp circles and diameters, with the ring
       lighting up where the skin is at its extremes. */
    resonate: function (k) {
      /* the geometry AND the mode shape come from the field, so the dashed node
         circles land exactly where the particles actually stand still */
      var G = (root.PVFIELD && root.PVFIELD.membraneGeom) ? root.PVFIELD.membraneGeom()
            : { cx: 960, cy: 500, R: 340, ax: 1.06, ay: .78, radial: [.212, .637], lobes: 3 };
      var cx = G.cx, cy = G.cy, r = G.R, ax = G.ax, ay = G.ay;
      var t = clock * 5.2;
      /* the rim */
      stroke2(function () { ctx.arc(cx, cy, r, 0, TAU); }, 3, .38, .92);
      /* the radial node CIRCLES — the zeros of cos(rn*K), from the field */
      for (var i = 0; i < G.radial.length; i++) {
        var nr = G.radial[i] * r;
        ctx.strokeStyle = col(.22, 70); ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.ellipse(cx, cy, nr * ax, nr * ay, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the diametric nodes: cos(lobes * a) = 0 */
      var lobes = G.lobes || 3;
      for (var d = 0; d < lobes; d++) {
        var a = (d + .5) * Math.PI / lobes;
        ctx.strokeStyle = col(.18, 66); ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * r * ax, cy - Math.sin(a) * r * ay);
        ctx.lineTo(cx + Math.cos(a) * r * ax, cy + Math.sin(a) * r * ay);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      /* the antinodes: 2*lobes lobes trading brightness in antiphase, which is
         what a standing wave does — it does not travel anywhere */
      var nLobe = lobes * 2;
      for (var s = 0; s < nLobe; s++) {
        var sa = s * Math.PI / lobes * 1.0 + Math.PI / lobes - Math.PI / lobes;
        var phase = Math.sin(t + (s % 2 ? Math.PI : 0));
        var amp = Math.abs(phase);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r * 1.2, sa - Math.PI / nLobe, sa + Math.PI / nLobe);
        ctx.closePath();
        ctx.clip();
        var lg = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
        lg.addColorStop(0, col(.10, 68));
        lg.addColorStop(1, col(.52 * amp + .22, 92));
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.ellipse(cx, cy, r * ax, r * ay, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    },

    /* ---- 接上电源 : the power line ------------------------------------------
       A real cable: a thick insulated run with a plug block on the left, and
       the live current travelling down it as a bright head with a comet tail.
       Everything ahead of the head is drawn dead, so the switch-on is visible
       as a wavefront rather than as the whole line lighting at once. */
    powerline: function (k) {
      var G = (root.PVFIELD && root.PVFIELD.powerGeom) ? root.PVFIELD.powerGeom()
            : { y: 540, x0: 300, x1: 1620, thick: 30, plugW: 150, head: .4, settle: 1 };
      var y = G.y, th = G.thick;
      /* the dead cable: a dark core with a visible jacket edge */
      ctx.strokeStyle = col(.16, 58); ctx.lineWidth = th;
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(G.x0, y); ctx.lineTo(G.x1, y); ctx.stroke();
      /* the live section behind the head */
      var hx = G.x0 + Math.min(1, G.head) * (G.x1 - G.x0);
      if (G.head > 0) {
        var lg = ctx.createLinearGradient(G.x0, 0, hx, 0);
        lg.addColorStop(0, col(.62, 78));
        lg.addColorStop(1, col(.95, 96));
        ctx.strokeStyle = lg; ctx.lineWidth = th;
        glow(col(.6, 88), 26);
        ctx.beginPath(); ctx.moveTo(G.x0, y); ctx.lineTo(hx, y); ctx.stroke();
        noGlow();
      }
      /* the head itself: a bright bead with a short comet tail */
      if (G.head <= 1) {
        glow(col(.7, 92), 34);
        ctx.fillStyle = col(1, 99);
        ctx.beginPath(); ctx.arc(hx, y, 13, 0, TAU); ctx.fill();
        noGlow();
        for (var t = 1; t <= 9; t++) {
          ctx.fillStyle = col((1 - t / 9) * .7, 94);
          ctx.beginPath();
          ctx.arc(hx - t * 15, y, 8 - t * .6, 0, TAU);
          ctx.fill();
        }
      }
      /* the plug on the left, with its pins */
      ctx.fillStyle = col(.85, 74);
      ctx.fillRect(G.x0 - G.plugW, y - th * .95, G.plugW, th * 1.9);
      ctx.strokeStyle = col(1, 92); ctx.lineWidth = 2.5;
      ctx.strokeRect(G.x0 - G.plugW, y - th * .95, G.plugW, th * 1.9);
      for (var p = 0; p < 2; p++) {
        ctx.strokeStyle = col(.9, 88); ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(G.x0 - 8, y + (p ? 12 : -12)); ctx.lineTo(G.x0 + 26, y + (p ? 12 : -12));
        ctx.stroke();
      }
      /* while it is still arcing, sparks jump at the socket */
      if (G.settle < 1) {
        var sp = (1 - G.settle) * Math.abs(Math.sin(clock * 44));
        ctx.strokeStyle = col(sp, 96); ctx.lineWidth = 2;
        for (var s = 0; s < 7; s++) {
          var a = (s / 7) * TAU + clock * 6;
          var l = 20 + sp * 44 * (0.4 + Math.abs(Math.sin(clock * 31 + s)));
          ctx.beginPath();
          ctx.moveTo(G.x0, y);
          ctx.lineTo(G.x0 + Math.cos(a) * l, y + Math.sin(a) * l);
          ctx.stroke();
        }
      }
    },

    /* ---- 绝缘护具 : the insulation ------------------------------------------
       Solid plates in the same positions the particles are falling through, so
       the gear is a real object being fitted rather than a cloud changing shape.
       A plate that has just clamped gets a bright rim. */
    sheath: function (k) {
      var st = (root.PVFIELD && root.PVFIELD.sheathState) ? root.PVFIELD.sheathState() : [];
      if (!st || !st.length) return;
      var G = (root.PVFIELD && root.PVFIELD.powerGeom) ? root.PVFIELD.powerGeom() : { y: 540 };
      /* the cable underneath, dimmed as it gets covered */
      ctx.strokeStyle = col(.12, 52); ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(300, G.y); ctx.lineTo(1620, G.y); ctx.stroke();
      for (var i = 0; i < st.length; i++) {
        var s = st[i];
        if (s.p <= .001) continue;
        var x = s.x - s.w / 2, y = s.y - s.h / 2;
        var land = s.p >= .999;
        /* the plate body */
        var lg = ctx.createLinearGradient(0, y, 0, y + s.h);
        lg.addColorStop(0, col(land ? .88 : .40 * s.p + .20, land ? 76 : 58));
        lg.addColorStop(1, col(land ? .72 : .32 * s.p + .16, land ? 58 : 46));
        ctx.fillStyle = lg;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, s.w, s.h, 9);
        else ctx.rect(x, y, s.w, s.h);
        ctx.fill();
        /* the rim: bright on the plate that just locked */
        var flash = (land && s.age >= 0 && s.age < .28) ? (1 - s.age / .28) : 0;
        ctx.strokeStyle = col(land ? .70 + .30 * flash : .30, 92);
        ctx.lineWidth = 2 + flash * 3;
        if (flash > 0) glow(col(.6, 90), 22 + flash * 26);
        ctx.stroke();
        noGlow();
        /* ribbing, so it reads as moulded insulation and not a blank tile */
        if (land) {
          ctx.strokeStyle = col(.30, 74); ctx.lineWidth = 1.5;
          for (var r = 1; r < 4; r++) {
            var rx = x + (s.w / 4) * r;
            ctx.beginPath(); ctx.moveTo(rx, y + 6); ctx.lineTo(rx, y + s.h - 6); ctx.stroke();
          }
        }
      }
    },

    /* ---- the six countries -------------------------------------------------
       One country per counting beat, drawn as a crisp border over the filled
       particle silhouette. The outline comes from the field (same transform),
       so the border and the fill are one shape; the border is drawn only as far
       as the sweep has reached, which makes the map visibly being drawn. */
    geo: function (k) {
      var G = (root.PVFIELD && root.PVFIELD.geoGeom) ? root.PVFIELD.geoGeom(k.cc) : null;
      if (!G || !G.rings || !G.rings.length) return;
      var rings = G.rings, lit = Math.max(0, Math.min(1, G.k));
      /* total vertices across every ring, so the sweep runs over the WHOLE
         country — islands included — rather than over the mainland alone */
      var total = 0;
      for (var r0 = 0; r0 < rings.length; r0++) total += rings[r0].length;

      /* faint full outline, so the country is legible even before the sweep */
      ctx.strokeStyle = col(.16, 62); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var r1 = 0; r1 < rings.length; r1++) {
        var p1 = rings[r1];
        for (var i1 = 0; i1 < p1.length; i1++) {
          if (i1) ctx.lineTo(p1[i1][0], p1[i1][1]); else ctx.moveTo(p1[i1][0], p1[i1][1]);
        }
        ctx.closePath();
      }
      ctx.stroke();

      /* a light wash under the drawn part. Small islands (Taiwan, Hainan) get
         few particles because the pool is sampled by area, so without this they
         read as a bare outline rather than as land. */
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1920, 1080);
      ctx.clip();
      ctx.fillStyle = col(.30 * lit, 40);
      ctx.beginPath();
      for (var rw = 0; rw < rings.length; rw++) {
        var pw = rings[rw];
        if (!pw.length) continue;
        /* only wash the rings the sweep has already passed, so it fills in
           behind the border as it goes */
        var rseen = 0;
        for (var rs = 0; rs < rw; rs++) rseen += rings[rs].length;
        if (rseen > total * lit) break;
        for (var iw = 0; iw < pw.length; iw++) {
          if (iw) ctx.lineTo(pw[iw][0], pw[iw][1]); else ctx.moveTo(pw[iw][0], pw[iw][1]);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();

      /* the drawn portion, bright, sweeping around the outline */
      var budget = Math.max(2, Math.floor(total * lit));
      var seen = 0, last = null;
      ctx.strokeStyle = col(1, 96); ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      glow(col(.6, 88), 26);
      ctx.beginPath();
      for (var r2 = 0; r2 < rings.length && seen < budget; r2++) {
        var p2 = rings[r2];
        var take = Math.min(p2.length, budget - seen);
        for (var i2 = 0; i2 < take; i2++) {
          if (i2) ctx.lineTo(p2[i2][0], p2[i2][1]); else ctx.moveTo(p2[i2][0], p2[i2][1]);
          last = p2[i2];
        }
        seen += take;
      }
      ctx.stroke();
      noGlow();
      /* the hot head of the sweep */
      if (lit < 1 && last) {
        glow(col(.75, 92), 30);
        ctx.fillStyle = col(1, 99);
        ctx.beginPath(); ctx.arc(last[0], last[1], 8, 0, TAU); ctx.fill();
        noGlow();
      }
      /* the country's name, under the silhouette */
      if (lit > .6) {
        var allx = 0, ally = 0, cnt = 0, maxY = -1e9;
        for (var r3 = 0; r3 < rings.length; r3++) for (var i3 = 0; i3 < rings[r3].length; i3++) {
          allx += rings[r3][i3][0]; ally += rings[r3][i3][1]; cnt++;
          if (rings[r3][i3][1] > maxY) maxY = rings[r3][i3][1];
        }
        ctx.fillStyle = col((lit - .6) / .4 * .8, 92);
        ctx.font = '600 26px "Cascadia Mono", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(G.name.toUpperCase(), allx / cnt, maxY + 38);
        ctx.textAlign = 'left';
      }
    },

    /* ---- 切换我的角色 : two bodies trading places ---------------------------
       Solid silhouettes of two people, drawn at the positions the field reports
       (they orbit while swapping), with a motion trail while they are moving.
       The point of the beat is that the two EXCHANGE places, so the trail is
       what makes the swap legible at a glance. */
    roles: function (k) {
      var G = (root.PVFIELD && root.PVFIELD.rolesGeom) ? root.PVFIELD.rolesGeom() : null;
      if (!G || G.length < 2) return;
      var names = k.sm ? ['dom', 'sub'] : ['female', 'male'];
      /* the pivot they swing around: the arc they travel, drawn first so the
         bodies sit on top of it */
      ctx.strokeStyle = col(.30, 70); ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.ellipse(960, 490, 250, 175, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var i = 0; i < G.length; i++) {
        var b = G[i];
        /* the trail: ghosts left behind while the body is actually moving, so
           the EXCHANGE is legible rather than just two figures appearing in
           each other's places */
        if (b.busy > .06) {
          for (var t = 3; t >= 1; t--) {
            var bx = b.x + (i ? 1 : -1) * b.busy * t * 34;
            ctx.globalAlpha = .13 * b.busy / t;
            silhouette(names[i], bx, b.y, b.s);
          }
          ctx.globalAlpha = 1;
        }
        silhouette(names[i], b.x, b.y, b.s);
      }
    },

    /* ---- 恍惚出神 : the spiral ---------------------------------------------
       The same curve the particles are flowing along, drawn crisply: a bright
       head running inward and fading out, so the eye is pulled to the centre.
       A spiral is explicitly NOT a circle, which is the whole point — every
       other beat in this section was a ring. */
    trance: function (k) {
      var G = (root.PVFIELD && root.PVFIELD.spiralGeom) ? root.PVFIELD.spiralGeom() : null;
      if (!G || !G.pts || G.pts.length < 3) return;
      var pts = G.pts;
      /* the whole spiral, faint */
      ctx.strokeStyle = col(.16, 64); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
      /* the arms, each with a bright head at its own phase of the flow */
      for (var a = 0; a < G.arms; a++) {
        var off = a / G.arms;
        ctx.beginPath();
        var started = false;
        for (var j = 0; j < pts.length; j++) {
          var u = pts[j][2];
          /* each arm is one turn apart, so shift the phase along the curve */
          var uu = (u + off) % 1;
          if (uu > G.flow + .30) continue;         /* ahead of the head: unlit */
          if (uu < G.flow - .42) continue;         /* long past: faded out */
          if (!started) { ctx.moveTo(pts[j][0], pts[j][1]); started = true; }
          else ctx.lineTo(pts[j][0], pts[j][1]);
        }
        if (!started) continue;
        ctx.strokeStyle = col(.85, 92); ctx.lineWidth = 3;
        glow(col(.6, 88), 22);
        ctx.stroke();
        noGlow();
      }
      /* the eye of the trance: a bright point at the centre, pulsing */
      var pulse = .55 + .45 * Math.sin(clock * 2.6);
      glow(col(.7, 90), 30 + pulse * 30);
      ctx.fillStyle = col(pulse, 98);
      ctx.beginPath(); ctx.arc(G.cx, G.cy, 9 + pulse * 7, 0, TAU); ctx.fill();
      noGlow();
      /* faint concentric rings, so the centre reads as a well being fallen into */
      for (var r = 1; r <= 4; r++) {
        ctx.strokeStyle = col(.10 + .05 * r, 60);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(G.cx, G.cy, r * 34, r * 34 * .80, 0, 0, TAU);
        ctx.stroke();
      }
    },

    /* ---- 执行 / 死刑 : the guillotine --------------------------------------
       The solid instrument, from the field's own state — so the crisp frame and
       the particle frame are one machine. The uprights are fixed; the blade
       climbs one notch per chant and the rope goes slack the instant it is
       released, which is what makes the drop legible. */
    guillotine: function (k) {
      var G = (root.PVFIELD && root.PVFIELD.guillotineGeom) ? root.PVFIELD.guillotineGeom() : null;
      if (!G) return;
      var L = G.cx - G.halfW, R = G.cx + G.halfW;

      /* the top beam and the base */
      ctx.strokeStyle = col(.80, 84); ctx.lineWidth = 16;
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(L - 40, G.top); ctx.lineTo(R + 40, G.top); ctx.stroke();
      ctx.strokeStyle = col(.62, 70); ctx.lineWidth = 22;
      ctx.beginPath(); ctx.moveTo(L - 60, G.bot); ctx.lineTo(R + 60, G.bot); ctx.stroke();
      /* the two uprights */
      ctx.strokeStyle = col(.72, 78); ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(L, G.top); ctx.lineTo(L, G.bot); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R, G.top); ctx.lineTo(R, G.bot); ctx.stroke();

      /* the winch rope: taut while hauling, slack after the release */
      var slack = G.drop * 150;
      ctx.strokeStyle = col(.55, 80); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(G.cx, G.top - 60);
      ctx.lineTo(G.cx, G.bladeY + slack);
      ctx.stroke();

      /* the blade: a heavy wedge, brightest at the edge */
      var bw = G.halfW * .92, bh = G.bladeH;
      var by = G.bladeY;
      ctx.beginPath();
      ctx.moveTo(G.cx - bw * .62, by);
      ctx.lineTo(G.cx + bw * .62, by);
      ctx.lineTo(G.cx + bw * .30, by + bh);
      ctx.lineTo(G.cx - bw * .30, by + bh);
      ctx.closePath();
      var lg = ctx.createLinearGradient(0, by, 0, by + bh);
      lg.addColorStop(0, col(.90, 88));
      lg.addColorStop(1, col(1, 99));
      ctx.fillStyle = lg;
      if (G.drop > 0 && G.drop < 1) glow(col(.6, 90), 30);
      ctx.fill();
      noGlow();
      ctx.strokeStyle = col(1, 96); ctx.lineWidth = 2;
      ctx.stroke();
      /* the cutting edge */
      ctx.strokeStyle = col(1, 100); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(G.cx - bw * .30, by + bh); ctx.lineTo(G.cx + bw * .30, by + bh);
      ctx.stroke();

      /* the rung marker: n of 12, drawn on the left upright as a gauge */
      var u0 = G.top + 40, u1 = G.bot - 40;
      for (var r = 1; r <= 12; r++) {
        var ry = u1 - (r / 12) * (u1 - u0);
        var on = r <= G.n;
        ctx.strokeStyle = col(on ? .95 : .22, on ? 92 : 60);
        ctx.lineWidth = on ? 3 : 1.6;
        ctx.beginPath(); ctx.moveTo(L - 26, ry); ctx.lineTo(L - 6, ry); ctx.stroke();
      }
      /* the impact flash when it lands */
      if (G.ring > 0) {
        glow(col(.6, 92), 40 + G.ring * 50);
        ctx.strokeStyle = col(G.ring, 96); ctx.lineWidth = 3 + G.ring * 5;
        ctx.beginPath();
        ctx.ellipse(G.cx, G.bot - 30, 200 + (1 - G.ring) * 420, 40 + (1 - G.ring) * 90, 0, 0, TAU);
        ctx.stroke();
        noGlow();
      }
    },

    /* ---- SOLID human silhouettes: gender and role are BODIES ---- */
    female: function () { silhouette('female'); },
    male: function () { silhouette('male'); },
    dom: function () { silhouette('dom'); },
    sub: function () { silhouette('sub'); },

    /* -------------------------------------------------------------------------
       THE SEED — the surviving wedge of the heart, with the dead cursor melting
       into it. The piece that filled last, at 191.85, is the one thing the
       deletion could not reach; this draws its crisp edge over the particle
       fill, from the same geometry the field uses, so the two are one shape.
       ------------------------------------------------------------------------- */
    emerge: function (k) {
      var cx = 960, cy = 561;
      var t = clock - landT;
      var grow = Math.min(1, Math.max(0, t / 1.4));

      /* the cage, still there, still holding it in */
      ctx.strokeStyle = col(.34, 84); ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, W - 16, H - 16);
      var tick = 46;
      ctx.strokeStyle = col(.5, 90); ctx.lineWidth = 5;
      [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]]
        .forEach(function (c) {
          ctx.beginPath();
          ctx.moveTo(c[0] + c[2] * tick, c[1]); ctx.lineTo(c[0], c[1]);
          ctx.lineTo(c[0], c[1] + c[3] * tick);
          ctx.stroke();
        });

      /* the surviving wedge: ONE piece of ten, drawn from the same geometry the
         particles use so the crisp edge and the filled matter cannot disagree */
      var G = (root.PVFIELD && root.PVFIELD.heartGeom) ? root.PVFIELD.heartGeom({ s: 520 }) : null;
      if (G) {
        ctx.save();
        ctx.translate(cx, cy);
        var sc = .55 + grow * .30;
        ctx.scale(sc, sc);
        ctx.translate(-cx, -cy);
        ctx.strokeStyle = col(.8 + .2 * grow, 96); ctx.lineWidth = 7;
        ctx.beginPath();
        /* the last tenth of the angular ranking — the wedge that filled last */
        var a0 = -Math.PI * .5, a1 = -Math.PI * .5 + TAU / 10;
        for (var i = 0; i <= 30; i++) {
          var a = a0 + (a1 - a0) * i / 30;
          var rr = 150 * (1 + grow * .18);
          var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }

      /* the cursor stops executing. It melts: the block breaks into motes that
         drift up toward the core instead of blinking in place, which is what
         the terminal fading out above it is doing too. */
      var mx = 760, my = 690;
      var melt = Math.min(1, Math.max(0, t / 1.8));
      for (var m = 0; m < 26; m++) {
        var ph = m / 26;
        var ax = mx + ph * 26 * (1 - melt * .3);
        var ay = my - melt * (60 + ph * 300) - Math.sin(t * 2 + m) * 6 * melt;
        var al = (1 - melt) * .9 + .1;
        ctx.fillStyle = col(al, 92);
        ctx.fillRect(ax - 3, ay - 3, 6 + ph * 6, 6);
      }

      /* the core's own halo, so the seed reads as a light source */
      var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260 * (0.6 + grow * .5));
      halo.addColorStop(0, col(.55 + .3 * grow, 62));
      halo.addColorStop(1, col(0, 62));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 260 * (0.6 + grow * .5), 0, TAU);
      ctx.fill();
    },

    /* =========================================================================
       GLASS.
       -------------------------------------------------------------------------
       The old version drew eleven radial spokes in the CURRENT hue — gold lines
       on a gold frame, so the break had almost no contrast and read as a faint
       decoration rather than glass failing.

       Real impact glass breaks into CELLS: irregular spokes running out from the
       point of impact, crossed by concentric rings, so the surface becomes a
       mosaic of shards. And the thing that makes it legible is not the lines, it
       is that THE SHARDS SEPARATE — the gaps between them are the break.

       So: three irregular rings, the cells between them displaced outward as the
       beat runs, each shard edged in near-white (deliberately desaturated, so it
       does not dissolve into the gold) with a dark shadow just inside the edge.
       The white is the lit fracture face; the dark is the depth behind it.
       ======================================================================== */
    crack: function (k) {
      var t = clock - landT;
      var g = Math.min(1, Math.max(0, t / 1.7));
      var IX = 960, IY = 520;                    /* the point of impact */

      /* a ring of irregular points. Deterministic, so the fracture is the same
         pattern every time the beat is played rather than reshuffling. */
      function ring(r, n, seed, jit) {
        var out = [];
        for (var i = 0; i < n; i++) {
          var a = (i / n) * TAU + seed;
          var jr = r * (1 + jit * Math.sin(i * 2.399 + seed * 7));
          var ja = a + jit * .55 * Math.sin(i * 1.618 + seed * 3);
          out.push([IX + Math.cos(ja) * jr, IY + Math.sin(ja) * jr]);
        }
        return out;
      }
      var R0 = ring(64,   6, 0.40, .38);
      var R1 = ring(210, 10, 0.95, .32);
      var R2 = ring(430, 14, 0.20, .28);
      var R3 = ring(760, 18, 0.65, .22);
      var RINGS = [R0, R1, R2, R3];
      /* falloff per ring: the fracture is densest and brightest at the impact
         and thins out toward the edges, which is what tells the eye WHERE the
         glass was hit. Drawing every cell at the same weight turned the frame
         into an even wire mesh and buried the body in the middle. */
      var RING_A = [1.0, .82, .5, .24];
      var RING_W = [1.0, .95, .8, .62];

      /* the shards: for each pair of neighbouring rings, walk the inner ring and
         connect proportionally to the outer, so cells with different vertex
         counts still tile without gaps */
      var shards = [];
      for (var L = 0; L < RINGS.length - 1; L++) {
        var A = RINGS[L], B = RINGS[L + 1];
        for (var i = 0; i < A.length; i++) {
          var j0 = Math.floor(i * B.length / A.length);
          var j1 = Math.floor(((i + 1) % A.length) * B.length / A.length);
          var poly = [A[i], A[(i + 1) % A.length]];
          /* the outer edge, walked in the right direction */
          var steps = ((j1 - j0) + B.length) % B.length;
          if (steps === 0) steps = 1;
          for (var s = 0; s <= steps; s++) {
            poly.push(B[(j0 + s) % B.length]);
          }
          shards.push({ poly: poly, ring: L });
        }
      }

      /* each shard moves away from the impact; the further out it sits, the
         further it travels, which is how a real pane comes apart */
      function shardShift(poly, ring_i) {
        var mx = 0, my = 0, q;
        for (q = 0; q < poly.length; q++) { mx += poly[q][0]; my += poly[q][1]; }
        mx /= poly.length; my /= poly.length;
        var dx = mx - IX, dy = my - IY;
        var d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        /* ease-out, and scaled by the ring so the outer glass flies furthest */
        var amp = g * g * (9 + ring_i * 15);
        return [dx / d * amp, dy / d * amp];
      }

      /* --- the fracture faces: dark gap first, then the lit edge over it ---- */
      for (var pass = 0; pass < 2; pass++) {
        for (var si = 0; si < shards.length; si++) {
          var sh = shards[si];
          var off = shardShift(sh.poly, sh.ring);
          /* at rest the shards are still closed; the edge only appears once the
             glass actually starts to part, so the break has a beginning */
          var open = Math.min(1, g * 1.6);
          if (open <= 0.01) continue;
          ctx.beginPath();
          for (var q2 = 0; q2 < sh.poly.length; q2++) {
            var px = sh.poly[q2][0] + off[0] * open;
            var py = sh.poly[q2][1] + off[1] * open;
            if (q2) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          if (pass === 0) {
            /* the depth behind the break */
            ctx.strokeStyle = 'rgba(58,34,6,' + (.62 * open * RING_A[sh.ring]).toFixed(3) + ')';
            ctx.lineWidth = 9 * RING_W[sh.ring];
          } else {
            /* the lit fracture face — near-white and desaturated on purpose */
            ctx.strokeStyle = 'rgba(255,253,246,' + (.92 * open * RING_A[sh.ring]).toFixed(3) + ')';
            ctx.lineWidth = 2.6 * RING_W[sh.ring];
          }
          ctx.stroke();
        }
      }

      /* --- specular glints: short bright flashes on the shard corners ------- */
      ctx.lineCap = 'round';
      for (var gi = 0; gi < shards.length; gi += 2) {
        var gs = shards[gi];
        var go = shardShift(gs.poly, gs.ring);
        var v = gs.poly[1];
        var flash = Math.max(0, Math.sin(g * 6.4 + gi * 1.7));
        if (flash < .25) continue;
        ctx.strokeStyle = 'rgba(255,255,255,' + (.55 * flash * g).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(v[0] + go[0] * g - 16, v[1] + go[1] * g - 16);
        ctx.lineTo(v[0] + go[0] * g + 16, v[1] + go[1] * g + 16);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';

      /* --- the pane itself, tilting as it loses its shape ------------------- */
      {
        var a = Math.min(1, g * 1.25);
        ctx.strokeStyle = 'rgba(255,248,232,' + (.35 * a).toFixed(3) + ')';
        ctx.lineWidth = 5;
        ctx.strokeRect(8, 8, W - 16, H - 16);
      }

      /* --- the frame letting go -------------------------------------------- */
      var push = g * 130;
      ctx.strokeStyle = 'rgba(255,250,238,' + Math.max(0, .75 - g * .95).toFixed(3) + ')';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-push, 8); ctx.lineTo(W + push, 8);
      ctx.moveTo(-push, H - 8); ctx.lineTo(W + push, H - 8);
      ctx.moveTo(8, -push); ctx.lineTo(8, H + push);
      ctx.moveTo(W - 8, -push); ctx.lineTo(W - 8, H + push);
      ctx.stroke();

      /* --- the light going out through the top ----------------------------- */
      var w = 26 + g * 150;
      var lg = ctx.createLinearGradient(0, H, 0, -200);
      lg.addColorStop(0, col(0, 60));
      lg.addColorStop(.45, col(.55 * g + .25, 62));
      lg.addColorStop(1, col(Math.min(1, .55 + g * .45), 96));
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(IX - w * .5, H + 40);
      ctx.lineTo(IX + w * .5, H + 40);
      ctx.lineTo(IX + w * .16, -160);
      ctx.lineTo(IX - w * .16, -160);
      ctx.closePath();
      ctx.fill();
    },
  };

  /* one filled body, drawn from a compact outline spec */
  var BODY = {
    female: {
      head: [0, -.62, .13],
      hair: [[-.20, -.60], [-.23, -.32], [-.14, -.22], [.14, -.22], [.23, -.32], [.20, -.60]],
      torso: [[-.13, -.46], [.13, -.46], [.20, -.24], [.06, -.06], [-.06, -.06], [-.20, -.24]],
      skirt: [[-.06, -.07], [.06, -.07], [.30, .34], [-.30, .34]],
      legs: [[-.13, .34, .10, .60], [.03, .34, .10, .60]]
    },
    male: {
      head: [0, -.62, .135],
      torso: [[-.26, -.42], [.26, -.42], [.22, .02], [-.22, .02]],
      hips: [[-.22, .01], [.22, .01], [.20, .14], [-.20, .14]],
      legs: [[-.19, .14, .16, .62], [.03, .14, .16, .62]]
    },
    dom: {
      head: [0, -.70, .12],
      torso: [[-.15, -.56], [.15, -.56], [.17, -.18], [-.17, -.18]],
      legs: [[-.15, -.18, .12, .52], [.03, -.18, .12, .52]],
      arm: [[.15, -.50, .46, -.80, .045]],
      whip: [[.46, -.80, .74, -.62, .018]]
    },
    sub: {
      /* A kneeling figure spans less height than a standing one, but it must not
         have less MASS: drawn at the same scale as `dom` it read as a child
         kneeling next to an adult (measured: its glyph box was ~62% of the
         standing figure's). These coordinates are scaled up ~1.35x so the two
         bodies read as the same person in two postures. */
      head: [0, -.46, .155],
      back: [[-.27, -.30], [.135, -.30], [.405, .24], [-.135, .32]],
      knees: [[-.19, .30, .54, .16], [-.215, .46, .595, .135]]
    },

  };

  /* Draw one human silhouette. cx/cy/S default to the single-figure layout, but
     the role-swap beat draws TWO bodies that orbit, so the position has to be
     passable — the alternative (two canvases) would double the work for no
     reason. */
  function silhouette(name, cx, cy, S) {
    var B = BODY[name];
    if (!B) return;
    if (cx == null) cx = 1080;
    if (cy == null) cy = 470;
    if (S == null) S = 460;
    function X(x) { return cx + x * S; }
    function Y(y) { return cy + y * S; }
    var p = new Path2D();
    /* head */
    if (B.head) { p.moveTo(X(B.head[0]) + B.head[2] * S, Y(B.head[1])); p.arc(X(B.head[0]), Y(B.head[1]), B.head[2] * S, 0, TAU); }
    if (B.hair) { poly(p, B.hair, X, Y, S); }
    if (B.torso) { poly(p, B.torso, X, Y, S); }
    if (B.hips) { poly(p, B.hips, X, Y, S); }
    if (B.skirt) { poly(p, B.skirt, X, Y, S); }
    if (B.back) { poly(p, B.back, X, Y, S); }
    if (B.knees) { for (var i = 0; i < B.knees.length; i++) { var r = B.knees[i]; box(p, r[0], r[1], r[2], r[3], X, Y, S); } }
    if (B.legs) { for (var j = 0; j < B.legs.length; j++) { var L = B.legs[j]; box(p, L[0], L[1], L[2], L[3], X, Y, S); } }
    if (B.arm) { strokePath(p, B.arm[0], X, Y, S); }
    if (B.whip) { strokePath(p, B.whip[0], X, Y, S); }
    /* a soft body, lit from the upper left */
    var g = ctx.createLinearGradient(cx - S, cy - S, cx + S, cy + S);
    g.addColorStop(0, col(1, 78));
    g.addColorStop(1, col(1, 46));
    ctx.fillStyle = g;
    ctx.fill(p);
    ctx.strokeStyle = col(1, 90); ctx.lineWidth = 2;
    ctx.stroke(p);
  }
  function poly(p, pts, X, Y, S) {
    p.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (var i = 1; i < pts.length; i++) p.lineTo(X(pts[i][0]), Y(pts[i][1]));
    p.closePath();
  }
  function box(p, x, y, w, h, X, Y, S) {
    p.moveTo(X(x), Y(y)); p.lineTo(X(x + w), Y(y));
    p.lineTo(X(x + w), Y(y + h)); p.lineTo(X(x), Y(y + h)); p.closePath();
  }
  function strokePath(p, pts, X, Y, S) {
    /* a 3-point polyline segment (arm / whip) with round caps baked in */
    var w = pts[4] || .04;
    for (var i = 0; i < 3; i++) {
      var x = pts[i * 2], y = pts[i * 2 + 1];
      p.moveTo(X(x) + w * S, Y(y)); p.arc(X(x), Y(y), w * S, 0, TAU);
    }
  }

  /* ----------------------------------------------------------------- wiring */
  /* RESOLUTION ADAPTATION: the backing store is allocated at
     logical x render-scale and the context is scaled to match, so everything
     below keeps drawing in the 1920x1080 logical space. A fixed 1080p buffer
     stretched to a 2.5K panel is a 1.33x upscale of every stroked edge —
     which is most of the softness that read as jelly. */
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
    cv.id = 'pvvector';
    cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:2;';
    o.host.appendChild(cv);
    ctx = cv.getContext('2d');
    setRenderScale(RS);
  }

  function setLine(spec) {
    var v = spec && spec.k && spec.k.vec;
    if (!v) { mode = null; lastT = -1; return; }
    if (spec.t === lastT) return;
    lastT = spec.t;
    mode = v;
    K = spec.k || {};
    lineClock = clock;
    landT = clock;        /* when the current beat began, for landing animations */
  }

  function frame(o) {
    if (!ctx) return;
    clock += Math.min(.05, o.dt || .016);
    hue = o.hue == null ? hue : o.hue;
    sat = o.sat == null ? sat : o.sat;
    resetTransform();                        /* includes the render scale */
    ctx.clearRect(0, 0, W, H);
    if (!mode || !D[mode]) return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    D[mode](K);
  }

  root.PVVECTOR = {
    init: init, frame: frame, setLine: setLine,
    setRenderScale: setRenderScale,
    mode: function () { return mode; },
    /* how many heart wedges are on screen, so the tool can assert the shape
       actually completed instead of trusting the mode string */
    pieces: function () { return K.pieces == null ? null : K.pieces; },
    names: function () { return Object.keys(D); },
    /* the crossbar's landing state, so the beat can be asserted instead of
       inferred from pixels (halo rays and the dashed guide share its band) */
    bar: function () { return dbgBar; }
  };
})(window);

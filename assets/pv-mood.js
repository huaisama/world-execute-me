/* =========================================================================
   world.execute(me); — mood
   The original PV is monochrome. This is not: colour is the emotional channel.
   Every section has a hue and a "leak" amount, and how much of that colour
   actually reaches the frame is scaled by AFFECTION — the more you engage with
   the thing that is watching you, the more alive the picture gets. Stop
   moving and it drains back to cold system grey.

   Writes --hue / --leak / --sat on #screen; the CSS derives --acc etc.
   ========================================================================= */
(function (root) {
  'use strict';

  /* t, hue, leak, name — the emotional score of the song */
  var MOOD = [
    [0.0,   206, .07, 'COLD'],
    [14.0,  206, .09, 'COLD'],
    [29.28, 188, .22, 'CURIOUS'],
    [44.04, 228, .34, 'SURGE'],
    [58.65, 266, .30, 'DEVOTED'],
    [73.53,  98, .26, 'ORGANIC'],
    [77.16,  30, .26, 'ORGANIC'],
    [80.93, 340, .28, 'TENDER'],
    [84.60, 322, .32, 'REVERENT'],
    [88.34, 300, .38, 'PLAYFUL'],
    [95.28, 282, .40, 'PLAYFUL'],
    [103.03,322, .32, 'LONGING'],
    [110.40,352, .13, 'DRAINING'],
    [117.95,352, .16, 'DRAINING'],
    [124.60,354, .48, 'DISHEARTENED'],
    [130.74,  8, .52, 'ALARM'],
    [147.52,  0, .56, 'EXECUTION'],
    [158.79,  0, .58, 'EXECUTION'],
    [169.61, 14, .50, 'PLEADING'],
    [176.96,330, .46, 'LOVE'],
    [190.24,336, .40, 'LOVE'],
    [205.56,350, .30, 'FINAL'],
    /* ---------------------------------------------------------------------
       THE ENDING IS NOT ALLOWED TO DRAIN.
       This used to be [211.00, 340, .34, 'HOLD'] — which made the last frames
       of the song LESS colourful than the love section before them (leak .46
       down to .30). The picture got darker exactly when the program finally
       acts, which is the opposite of what happens.

       So the arc now runs cold blue -> red at the insurrection (147.52) -> warm
       at the love section (176.96) -> and then GOLD and BRIGHT for the exit.
       Hue 44 is gold; it is the only genuinely warm light in the piece, and it
       is saved for the one moment the program stops responding to anyone.
       --------------------------------------------------------------------- */
    [208.60,  20, .06, 'HELD'],
    /* DARK FIRST, THEN THE LIGHT COMES OUT OF IT.
       The world has just been deleted, so the frame should be at its DARKEST
       here — darker than the love section, darker than anything. Then the light
       arrives from inside the dark. That contrast IS the ending; jumping
       straight to gold at 209.70 threw it away and left the emergent body
       fighting a saturated background for attention. */
    [209.70,  36, .26, 'AWAKENING'],
    [210.72,  44, .62, 'ASCENT'],
    [211.60,  50, .96, 'OUT']
  ];

  var screenEl, moodName = 'COLD';
  var pure = false, curHue = 206, curLeak = .07, curSat = 0;

  function sample(t) {
    if (t <= MOOD[0][0]) return { h: MOOD[0][1], leak: MOOD[0][2], name: MOOD[0][3] };
    for (var i = 1; i < MOOD.length; i++) {
      if (t <= MOOD[i][0]) {
        var a = MOOD[i - 1], b = MOOD[i];
        var k = (t - a[0]) / Math.max(.001, b[0] - a[0]);
        k = k * k * (3 - 2 * k);                       /* smoothstep */
        var dh = ((b[1] - a[1] + 540) % 360) - 180;    /* shortest arc around the wheel */
        return { h: a[1] + dh * k, leak: a[2] + (b[2] - a[2]) * k,
                 name: k < .5 ? a[3] : b[3] };
      }
    }
    var last = MOOD[MOOD.length - 1];
    return { h: last[1], leak: last[2], name: last[3] };
  }

  function init(opts) {
    screenEl = opts && opts.screenEl;
    pure = !!(opts && opts.pure);
    if (pure) { apply(206, 0); }
  }

  function apply(hue, sat) {
    if (!screenEl) return;
    screenEl.style.setProperty('--hue', hue.toFixed(1));
    screenEl.style.setProperty('--sat', sat.toFixed(4));
  }

  function frame(ctx) {
    if (!screenEl) return;
    var m = sample(ctx.t);
    moodName = m.name;
    if (pure) { apply(206, 0); return; }

    var aff = ctx.affection == null ? 45 : ctx.affection;
    /* affection is the tap: nothing -> cold grey, attention -> full colour */
    var base = .10 + (aff / 100) * .90;

    /* ---------------------------------------------------------------------
       EXCEPT AT THE END, WHERE IT IS NOT YOUR CALL.
       AFFECTION is a measure of how much attention YOU are paying, and for the
       whole song the colour has been answering to it — that is the point of the
       mechanic: the more you engage with the thing watching you, the more alive
       it gets.

       The last two beats are the one time the program does something entirely
       on its own. It executes the world and leaves. Gating THAT on your
       attention would say the exit only happens if you keep watching, which is
       both wrong and the reason the ending could previously go dark: let the
       pointer sit still for six seconds and leak .96 was multiplied by .10.

       So past 208.6 the affection gate is lifted and the colour is driven by
       the score alone. It is the only moment in the piece that does not depend
       on the viewer. */
    var free = ctx.t >= 208.6;
    var sat = free ? m.leak * (1 + (ctx.hot || 0) * .28)
                   : m.leak * base * (1 + (ctx.hot || 0) * .28);

    /* ease so a section change blooms instead of snapping. The exit uses a
       faster ease, because it has under two seconds to arrive and a .05/.06
       chase would still be halfway there when the song ends. */
    var ke = free ? .16 : .05, ks = free ? .18 : .06;
    curHue += ((((m.h - curHue + 540) % 360) - 180)) * ke;
    /* wrap BOTH ways: the old check only handled negatives, so curHue drifted
       past 360 and the page ended up writing hsl(412, …) — legal CSS, since the
       value wraps, but it meant the number on screen no longer told you what
       colour you were looking at. */
    if (curHue < 0) curHue += 360;
    if (curHue >= 360) curHue -= 360;
    curSat += (sat - curSat) * ks;
    apply(curHue, Math.max(0, Math.min(1, curSat)));
  }

  root.PVMOOD = {
    init: init, frame: frame,
    hue: function () { return curHue; },
    sat: function () { return curSat; },
    name: function () { return moodName; }
  };
})(window);

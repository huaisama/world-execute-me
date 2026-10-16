/* ===========================================================================
   pv-dpr.js — one place that decides the RENDER scale.
   ---------------------------------------------------------------------------
   The stage is a fixed 1920x1080 logical space, and every canvas layer used to
   allocate exactly 1920x1080 and let CSS `transform: scale()` stretch it to the
   display. On a 2560-wide panel that scale is 1.33x, so a 1080p buffer was
   being blown up 33% — soft, shimmery, and it made fast motion look like jelly
   because every edge was resampled by the compositor.

   The fix: allocate the canvas BACKING STORE at the size it will actually
   occupy on screen (logical size x display scale x devicePixelRatio), then
   scale the drawing context so all the existing 1920x1080 drawing code keeps
   working unchanged.

   `renderScale()` is the single source of truth. It is capped, because an
   uncapped 4K + 200% display would ask for a 7680-wide buffer per layer and
   three of those is more memory and fill rate than the page can afford —
   past the cap the browser's own upscale is good enough.
   =========================================================================== */
(function (root) {
  'use strict';

  var MAX_SCALE = 2.0;       /* never allocate more than 2x the logical size */
  var last = 1;

  /* The display scale factor `--s` is applied by CSS, and devicePixelRatio is
     applied by the OS. A canvas is crisp only when its backing store equals
     logical x s x dpr, so that product IS the render scale. */
  function renderScale(displayScale) {
    var dpr = root.devicePixelRatio || 1;
    var s = (displayScale || 1) * dpr;
    if (!(s > 0)) s = 1;
    if (s > MAX_SCALE) s = MAX_SCALE;
    /* do not shrink below 1: a 1080p buffer upscaled is exactly what we are
       getting rid of, so sub-1 scales are clamped up too */
    if (s < 1) s = 1;
    last = s;
    return s;
  }

  function current() { return last; }

  root.PVDPR = { renderScale: renderScale, current: current, MAX_SCALE: MAX_SCALE };
})(window);

/* Test the SPRING in isolation — no forces, no browser.
   ---------------------------------------------------------------------------
   The in-page metric was confounded: many forces deliberately oscillate their
   own offset (perimeter's sin(clock*1.9)*90, the dial's tremor, …), so a
   particle's distance to its static target swings by design. That is motion,
   not jelly.

   Jelly is a property of the INTEGRATOR alone, and the integrator is three
   lines, so it can be tested exactly and deterministically here:

       v = (v + (target - x) * spring) * damp
       x = x + v

   Feed it a step (start far from the target, at rest) and record whether x
   passes the target and comes back. That excursion IS the wobble.

   node _pv/spring.mjs
*/
'use strict';

function stepResponse(spring0, damp0, hz, seconds) {
  /* the integrator runs at `hz`; the coefficients are the 60fps-tuned ones
     rescaled exactly as pv-field.js does it, so this tests the real thing */
  const r = (1 / hz) * 60;
  const spring = spring0 * r;
  const damp = Math.pow(damp0, r);

  let x = 0, v = 0;
  const target = 100;              /* a 100px step */
  const dt = 1 / hz;
  const n = Math.round(seconds * hz);
  let peak = 0, crossings = 0, prevErr = target - x, settledAt = -1;

  for (let i = 0; i < n; i++) {
    v = (v + (target - x) * spring) * damp;
    x += v;
    const err = target - x;
    if (x > peak) peak = x;
    /* a crossing is the particle passing through the target */
    if ((prevErr > 0 && err < 0) || (prevErr < 0 && err > 0)) crossings++;
    prevErr = err;
    if (settledAt < 0 && Math.abs(err) < target * 0.02) settledAt = i * dt;
  }
  const overshootPct = peak > target ? (peak - target) / target * 100 : 0;
  return { overshootPct, crossings, settledAt };
}

/* ---- the ANALYTIC spring now used by pv-field.js -------------------------
   x'' + 2 zeta w x' + w^2 x = 0, integrated with its closed-form solution so
   the result depends only on elapsed TIME, never on the step count. */
function analyticStep(x, v, target, w, zeta, dt) {
  const ex = Math.exp(-zeta * w * dt);
  const wd = w * Math.sqrt(Math.max(0.0001, 1 - zeta * zeta));
  const c = Math.cos(wd * dt), s = Math.sin(wd * dt);
  const dx = target - x;
  const A = dx, B = (v + zeta * w * dx) / wd;
  const nx = target - ex * (A * c + B * s);
  const nv = ex * (v * c - ((w * w * dx + zeta * w * v) / wd) * s);
  return [nx, nv];
}

function analyticResponse(hz, seconds, zeta) {
  const omega = Math.sqrt(0.105) * 60;
  const w = omega * (0.72 + 1.0 * 0.28);      /* p.w = 1, fully ramped in */
  let x = 0, v = 0;
  const target = 100, dt = 1 / hz, n = Math.round(seconds * hz);
  let peak = 0, crossings = 0, prevErr = target, settledAt = -1;
  for (let i = 0; i < n; i++) {
    const r = analyticStep(x, v, target, w, zeta, dt);
    x = r[0]; v = r[1];
    const err = target - x;
    if (x > peak) peak = x;
    if ((prevErr > 0 && err < 0) || (prevErr < 0 && err > 0)) crossings++;
    prevErr = err;
    if (settledAt < 0 && Math.abs(err) < target * 0.02) settledAt = i * dt;
  }
  return { overshootPct: peak > target ? (peak - target) / target * 100 : 0, crossings, settledAt };
}

console.log('=== ANALYTIC spring (the one now shipped) ===');
console.log('  zeta=0.95, omega as tuned, 100px step\n');
console.log('    rate    overshoot   crossings   settles');
for (const hz of [30, 60, 90, 144, 300]) {
  const r = analyticResponse(hz, 2.5, 0.95);
  console.log(`    ${String(hz).padStart(3)}Hz  ${r.overshootPct.toFixed(2).padStart(8)}%   ` +
              `${String(r.crossings).padStart(9)}   ${r.settledAt < 0 ? '  never' : r.settledAt.toFixed(3) + 's'}`);
}
console.log('\n  (these must all agree: that is what makes the physics frame-rate independent)');

console.log('\n=== OLD discrete recurrence, for comparison ===');
console.log('  damping            overshoot   zero-crossings   settles in');
console.log('  ------------------------------------------------------------');
for (const [label, k, d] of [
  ['OLD  .105 / .78 (shipped)', 0.105, 0.78],
  ['mine .105 / .60 (wrong)',   0.105, 0.60]
]) {
  const r = stepResponse(k, d, 300, 2.5);
  console.log(`  ${label.padEnd(30)} ${r.overshootPct.toFixed(1).padStart(7)}%   ` +
              `${String(r.crossings).padStart(10)}   ` +
              `${r.settledAt < 0 ? '  never' : r.settledAt.toFixed(3) + 's'}`);
}
console.log('\n  and the recurrence at different rates (why it had to go):');
for (const hz of [30, 60, 144, 300]) {
  const r = stepResponse(0.105, 0.60, hz, 2.5);
  console.log(`    ${String(hz).padStart(3)}Hz  overshoot ${r.overshootPct.toFixed(1)}%  crossings ${r.crossings}`);
}

/* pv-icons.js — flat monochrome pictogram set for the "world.execute(me);" PV recreation.
   Plain script, no modules. Exposes window.PVICON: { name: '<svg .../>' }.
   Every icon: viewBox 0 0 100 100, no width/height, colour only via currentColor. */
(function (root) {
  'use strict';

  var SVG_OPEN = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none"';

  /* Root carries the stroke recipe for pure line icons. */
  function line(sw, body) {
    return SVG_OPEN + ' stroke="currentColor" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  /* Root is fill="none" only; each child declares its own paint. */
  function mixed(body) {
    return SVG_OPEN + '>' + body + '</svg>';
  }

  var PVICON = {

    /* 1 — power ⏻: 300 deg arc open at the top + vertical stem */
    power: line(3,
      '<path d="M 65 26.02 A 30 30 0 1 1 35 26.02"/>' +
      '<path d="M 50 46 L 50 20"/>'),

    /* 2 — shield outline with a checkmark */
    shieldCheck: line(3,
      '<path d="M 50 12 L 81 22 L 81 49 C 81 69 67 82 50 89 C 33 82 19 69 19 49 L 19 22 Z"/>' +
      '<path d="M 35 50 L 45 61 L 66 39"/>'),

    /* 3 — solid shield with a knocked-out keyhole (evenodd) */
    shieldKeyhole: mixed(
      '<path fill="currentColor" fill-rule="evenodd" d="' +
      'M 50 10 L 84 21 L 84 50 C 84 70 69 84 50 91 C 31 84 16 70 16 50 L 16 21 Z ' +
      'M 43.94 45.5 A 7 7 0 1 1 56.06 45.5 L 59 68 L 41 68 Z"/>'),

    /* 4 — barcode / progress blocks: 8 bars, 4 distinct widths */
    barcode: mixed(
      '<rect x="14" y="18" width="6" height="64" fill="currentColor"/>' +
      '<rect x="25" y="18" width="2" height="64" fill="currentColor"/>' +
      '<rect x="33" y="18" width="8" height="64" fill="currentColor"/>' +
      '<rect x="45" y="18" width="3" height="64" fill="currentColor"/>' +
      '<rect x="54" y="18" width="2" height="64" fill="currentColor"/>' +
      '<rect x="61" y="18" width="7" height="64" fill="currentColor"/>' +
      '<rect x="74" y="18" width="3" height="64" fill="currentColor"/>' +
      '<rect x="82" y="18" width="4" height="64" fill="currentColor"/>'),

    /* 5 — 12 equal blocks, even gaps */
    bars: mixed(
      '<rect x="12" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="18.55" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="25.09" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="31.64" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="38.18" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="44.73" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="51.27" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="57.82" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="64.36" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="70.91" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="77.45" y="30" width="4" height="40" fill="currentColor"/>' +
      '<rect x="84" y="30" width="4" height="40" fill="currentColor"/>'),

    /* 6 — solid eggplant, body + leafy calyx + stalk, tilted 15 deg */
    eggplant: mixed(
      '<g transform="translate(-3 0) rotate(-15 50 50)">' +
      '<path fill="currentColor" d="M 50 24 C 58 24 73 47 73 62 C 73 76 63 84 50 84 ' +
      'C 37 84 27 76 27 62 C 27 47 42 24 50 24 Z"/>' +
      '<path fill="currentColor" d="M 50 11 L 54.7 21.53 L 66.17 22.75 L 57.61 30.47 ' +
      'L 59.99 41.75 L 50 36 L 40.01 41.75 L 42.39 30.47 L 33.83 22.75 L 45.3 21.53 Z"/>' +
      '<path fill="currentColor" d="M 47 17 C 46.5 11 48.5 6 52 3.5 C 54.5 2 56 4 54.5 6.5 ' +
      'C 52.5 9.5 52.5 13 54 17 Z"/>' +
      '</g>'),

    /* 7 — solid tomato, squashed body + 5-point calyx star */
    tomato: mixed(
      '<ellipse cx="50" cy="62" rx="33" ry="27" fill="currentColor"/>' +
      '<path fill="currentColor" d="M 50 14 L 53.23 26.55 L 66.17 25.75 L 55.23 32.7 ' +
      'L 59.99 44.75 L 50 36.5 L 40.01 44.75 L 44.77 32.7 L 33.83 25.75 L 46.77 26.55 Z"/>' +
      '<path fill="currentColor" d="M 48.4 17 L 49 7 L 51 7 L 51.6 17 Z"/>'),

    /* 8 — tapered tumbler with three liquid drops */
    glass: mixed(
      '<path d="M 26 22 L 32.5 80 C 32.8 83 34.5 84.5 37 84.5 L 63 84.5 C 65.5 84.5 67.2 83 67.5 80 ' +
      'L 74 22 Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="42" cy="58" r="3.5" fill="currentColor"/>' +
      '<circle cx="52" cy="68" r="3.5" fill="currentColor"/>' +
      '<circle cx="60" cy="57" r="3.5" fill="currentColor"/>'),

    /* 9 — solid sitting cat in profile, tail curling round the front */
    cat: mixed(
      '<path fill="currentColor" d="M 38 18 C 60 14 84 30 84 50 C 84 62 80 71 74 74 ' +
      'L 36 74 C 28 68 25 54 27 42 C 29 32 33 25 38 18 Z"/>' +
      '<path fill="currentColor" d="M 32 15 C 40 15 45 21 45 28 C 45 35 40 41 32 41 ' +
      'C 24 41 19 35 19 28 C 19 21 24 15 32 15 Z"/>' +
      '<path fill="currentColor" d="M 22 25 L 11 31 L 22 36 Z"/>' +
      '<path fill="currentColor" d="M 21 22 L 18 7 L 31 17 Z"/>' +
      '<path fill="currentColor" d="M 33 16 L 40 5 L 44 20 Z"/>' +
      '<path fill="currentColor" d="M 27 44 C 24 58 23 72 24 80 L 41 80 C 41 72 41 58 41 44 Z"/>' +
      '<path fill="currentColor" d="M 82 62 C 90 72 88 86 72 89 C 56 92 30 90 20 82 ' +
      'C 13 76 15 66 21 64 C 27 62 29 70 27 75 C 33 82 54 84 66 80 C 74 76 76 69 72 62 Z"/>'),

    /* 10 — thin magnifier, lens + 45 deg handle */
    magnifier: line(3,
      '<circle cx="42" cy="42" r="26"/>' +
      '<path d="M 61 61 L 85 85"/>'),

    /* 11 — two solid meshing gears with evenodd hub holes */
    gears: mixed(
      '<path fill="currentColor" fill-rule="evenodd" d="M 55.88 27.63 L 62.79 29.45 L 62.79 36.55 ' +
      'L 55.88 38.37 L 53.98 43.6 L 58.1 49.43 L 53.54 54.87 L 47.08 51.82 L 42.26 54.6 ' +
      'L 41.67 61.72 L 34.67 62.95 L 31.69 56.46 L 26.21 55.5 L 21.18 60.57 L 15.03 57.02 ' +
      'L 16.91 50.13 L 13.34 45.87 L 6.22 46.53 L 3.79 39.85 L 9.67 35.78 L 9.67 30.22 ' +
      'L 3.79 26.15 L 6.22 19.47 L 13.34 20.13 L 16.91 15.87 L 15.03 8.98 L 21.18 5.43 ' +
      'L 26.21 10.5 L 31.69 9.54 L 34.67 3.05 L 41.67 4.28 L 42.26 11.4 L 47.08 14.18 ' +
      'L 53.54 11.13 L 58.1 16.57 L 53.98 22.4 Z M 24 33 A 9 9 0 1 0 42 33 A 9 9 0 1 0 24 33 Z"/>' +
      '<path fill="currentColor" fill-rule="evenodd" d="M 82.86 67 L 86.99 68.43 L 86.62 72.68 ' +
      'L 82.3 73.37 L 80.9 76.38 L 83.15 80.13 L 80.13 83.15 L 76.38 80.9 L 73.37 82.3 ' +
      'L 72.68 86.62 L 68.43 86.99 L 67 82.86 L 63.8 82 L 60.49 84.86 L 57 82.42 ' +
      'L 58.56 78.33 L 56.66 75.62 L 52.29 75.68 L 51.18 71.57 L 55.01 69.44 L 55.3 66.14 ' +
      'L 51.9 63.38 L 53.7 59.51 L 58 60.34 L 60.34 58 L 59.51 53.7 L 63.38 51.9 ' +
      'L 66.14 55.3 L 69.44 55.01 L 71.57 51.18 L 75.68 52.29 L 75.62 56.66 L 78.33 58.56 ' +
      'L 82.42 57 L 84.86 60.49 L 82 63.8 Z M 63.5 69 A 5.5 5.5 0 1 0 74.5 69 ' +
      'A 5.5 5.5 0 1 0 63.5 69 Z"/>'),

    /* 12 — solid trash can, lid + handle, three slots knocked out */
    trash: mixed(
      '<path fill="currentColor" d="M 45 12 L 45 8.5 C 45 6.8 46.8 6 50 6 C 53.2 6 55 6.8 55 8.5 ' +
      'L 55 12 Z"/>' +
      '<path fill="currentColor" d="M 20 13 L 80 13 L 80 21 L 20 21 Z"/>' +
      '<path fill="currentColor" fill-rule="evenodd" d="M 25 23 L 75 23 L 70.5 88 ' +
      'C 70.3 90.5 68.5 92 66 92 L 34 92 C 31.5 92 29.7 90.5 29.5 88 Z ' +
      'M 37 37 L 43 37 L 43 73 C 43 75.5 37 75.5 37 73 Z ' +
      'M 47 37 L 53 37 L 53 73 C 53 75.5 47 75.5 47 73 Z ' +
      'M 57 37 L 63 37 L 63 73 C 63 75.5 57 75.5 57 73 Z"/>'),

    /* 13 — wireframe octahedron: hexagon, vertical axis, inner Y edges */
    octahedron: line(2.5,
      '<path d="M 50 10 L 84 31 L 84 69 L 50 90 L 16 69 L 16 31 Z"/>' +
      '<path d="M 50 10 L 50 90"/>' +
      '<path d="M 50 10 L 84 69"/>' +
      '<path d="M 50 10 L 16 69"/>' +
      '<path d="M 50 90 L 84 31"/>' +
      '<path d="M 50 90 L 16 31"/>'),

    /* 14 — low-poly triangulated heart, 16 triangles, edges only */
    heartWire: line(2.5,
      '<path d="M 50 48 L 12 40 L 18 24 Z M 50 48 L 18 24 L 32 18 Z M 50 48 L 32 18 L 50 30 Z ' +
      'M 50 48 L 50 30 L 68 18 Z M 50 48 L 68 18 L 82 24 Z M 50 48 L 82 24 L 88 40 Z ' +
      'M 50 48 L 88 40 L 80 58 Z M 50 48 L 80 58 L 66 64 Z M 50 48 L 20 58 L 12 40 Z ' +
      'M 50 48 L 34 64 L 20 58 Z M 50 48 L 34 64 L 66 64 Z M 66 64 L 80 58 L 68 74 Z ' +
      'M 66 64 L 68 74 L 50 90 Z M 34 64 L 66 64 L 50 90 Z M 34 64 L 50 90 L 32 74 Z ' +
      'M 34 64 L 32 74 L 20 58 Z"/>'),

    /* 15 — system restore: counter-clockwise arc + arrowhead + clock hand */
    restore: mixed(
      '<path d="M 65 26.02 A 30 30 0 1 1 35 26.02" stroke="currentColor" stroke-width="3" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path fill="currentColor" d="M 53.74 19.52 L 68.5 19.96 L 61.5 32.08 Z"/>' +
      '<path d="M 50 52 L 58 44" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),

    /* 16 — solid play triangle */
    play: mixed(
      '<path fill="currentColor" d="M 27 14 L 85 50 L 27 86 Z"/>'),

    /* 17 — rounded warning triangle with exclamation */
    warn: mixed(
      '<path d="M 57.82 25.74 L 83.34 70.55 A 9 9 0 0 1 75.52 84 L 24.48 84 ' +
      'A 9 9 0 0 1 16.66 70.55 L 42.18 25.74 A 9 9 0 0 1 57.82 25.74 Z" ' +
      'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="47.5" y="36" width="5" height="27" rx="2.5" fill="currentColor"/>' +
      '<circle cx="50" cy="73" r="3.2" fill="currentColor"/>'),

    /* 18 — no entry: circle plus one diagonal bar */
    noEntry: line(3,
      '<circle cx="50" cy="50" r="32"/>' +
      '<path d="M 27.37 27.37 L 72.63 72.63"/>'),

    /* 19 — solid crown with pearl tips over a rule, sword below */
    crownSword: mixed(
      '<path fill="currentColor" d="M 22 41 L 16 14 L 33 28 L 50 10 L 67 28 L 84 14 L 78 41 Z"/>' +
      '<circle cx="16" cy="14" r="4.5" fill="currentColor"/>' +
      '<circle cx="50" cy="10" r="4.5" fill="currentColor"/>' +
      '<circle cx="84" cy="14" r="4.5" fill="currentColor"/>' +
      '<path d="M 13 44 L 87 44" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M 47 48 L 19 80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M 35.52 45.93 L 50.58 59.11" stroke="currentColor" stroke-width="3" ' +
      'stroke-linecap="round"/>'),

    /* 20 — female sign, thick */
    genderF: line(5,
      '<circle cx="50" cy="36" r="22"/>' +
      '<path d="M 50 58 L 50 88"/>' +
      '<path d="M 34 70 L 66 70"/>'),

    /* 21 — male sign, thin */
    genderM: line(2.5,
      '<circle cx="41" cy="59" r="22"/>' +
      '<path d="M 56.56 43.44 L 82 18"/>' +
      '<path d="M 68.84 22.79 L 82 18 L 77.21 31.16"/>'),

    /* 22 — combined sign: arrow up-right + cross down */
    genderCombined: line(3,
      '<circle cx="47" cy="45" r="21"/>' +
      '<path d="M 61.85 30.15 L 76 16"/>' +
      '<path d="M 65.66 19.76 L 76 16 L 72.24 26.34"/>' +
      '<path d="M 47 66 L 47 88"/>' +
      '<path d="M 37 77 L 57 77"/>'),

    /* 23 — dial: outer circle, 24 ticks, centre dot */
    dial: mixed(
      '<circle cx="50" cy="50" r="36" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M 77 50 L 84 50 M 76.08 56.99 L 82.84 58.8 M 73.38 63.5 L 79.44 67 ' +
      'M 69.09 69.09 L 74.04 74.04 M 63.5 73.38 L 67 79.44 M 56.99 76.08 L 58.8 82.84 ' +
      'M 50 77 L 50 84 M 43.01 76.08 L 41.2 82.84 M 36.5 73.38 L 33 79.44 ' +
      'M 30.91 69.09 L 25.96 74.04 M 26.62 63.5 L 20.56 67 M 23.92 56.99 L 17.16 58.8 ' +
      'M 23 50 L 16 50 M 23.92 43.01 L 17.16 41.2 M 26.62 36.5 L 20.56 33 ' +
      'M 30.91 30.91 L 25.96 25.96 M 36.5 26.62 L 33 20.56 M 43.01 23.92 L 41.2 17.16 ' +
      'M 50 23 L 50 16 M 56.99 23.92 L 58.8 17.16 M 63.5 26.62 L 67 20.56 ' +
      'M 69.09 30.91 L 74.04 25.96 M 73.38 36.5 L 79.44 33 M 76.08 43.01 L 82.84 41.2" ' +
      'stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="3" fill="currentColor"/>'),

    /* 24 — page with text lines, magnifier over the lower-right corner */
    textPage: mixed(
      '<rect x="18" y="10" width="50" height="66" rx="3" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M 27 27 L 59 27 M 27 39 L 59 39 M 27 51 L 47 51" stroke="currentColor" ' +
      'stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="70" cy="70" r="17" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M 82.02 82.02 L 89 89" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round"/>'),

    /* 25 — anchor stem with square knob */
    anchor: mixed(
      '<path d="M 50 12 L 50 88" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="43" y="44" width="14" height="14" rx="2" fill="currentColor"/>'),

    /* 26 — four dots in a row */
    dots: mixed(
      '<circle cx="20" cy="50" r="6" fill="currentColor"/>' +
      '<circle cx="40" cy="50" r="6" fill="currentColor"/>' +
      '<circle cx="60" cy="50" r="6" fill="currentColor"/>' +
      '<circle cx="80" cy="50" r="6" fill="currentColor"/>'),

    /* 27 — single thin ring */
    ring: line(3,
      '<circle cx="50" cy="50" r="37"/>'),

    /* 28 — thin key: bow with hole, shaft, two teeth */
    key: line(3,
      '<circle cx="28" cy="50" r="17"/>' +
      '<circle cx="28" cy="50" r="6.5"/>' +
      '<path d="M 45 50 L 88 50"/>' +
      '<path d="M 73 50 L 73 66"/>' +
      '<path d="M 83 50 L 83 60"/>')
  };

  root.PVICON = PVICON;
})(window);

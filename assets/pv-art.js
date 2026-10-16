/* =========================================================================
   world.execute(me); — character art
   The animals and small objects are drawn with CHARACTERS, laid out by hand and
   rendered as real monospace text. Not sampled, not approximated with circles:
   if the line says "If I'm a tabby cat", there is a cat, and it is type.

   Shapes are defined as an array of equal-length strings; each non-space
   character is an ink cell.
   ========================================================================= */
(function (root) {
  'use strict';

  var ART = {
    /* a seated tabby, tail around the front paws, facing you */
    cat: [
      '     /\\_/\\        ',
      '    ( o.o )       ',
      '     > ^ <        ',
      '    /     \\       ',
      '   /  |   | \\     ',
      '  (   |   |  )    ',
      '   \\  |   | /     ',
      '    \\_|___|_/     ',
      '     |     |      ',
      '    _|     |_     ',
      '   (__________)   ',
      '    ~  ~~~~  ~    '
    ],
    /* an eggplant: narrow neck, fat body, calyx on top */
    eggplant: [
      '       ,-.       ',
      '      (   )      ',
      "       `-'       ",
      '      /   \\      ',
      '     /     \\     ',
      '    / .   . \\    ',
      '   |    _    |   ',
      '   |   (_)   |   ',
      '    \\       /    ',
      '     \\     /     ',
      '      \\   /      ',
      '       \\_/       '
    ],
    /* a tomato: round, calyx star on top */
    tomato: [
      '      \\ | /      ',
      '    --- * ---    ',
      '   /         \\   ',
      '  |  o     o  |  ',
      '  |     _     |  ',
      '  |    (_)    |  ',
      '   \\         /   ',
      '    \\_______/    '
    ],
    /* a glass of antioxidants */
    glass: [
      '  \\           /  ',
      '   \\_________/   ',
      '   |         |   ',
      '   |   o     |   ',
      '   |      o  |   ',
      '   |   o     |   ',
      '   |_________|   ',
      '    \\_______/    '
    ],
    /* the crown, for "To S" */
    crown: [
      '  \\  /  |  \\  /  ',
      '   \\/   |   \\/   ',
      '   |\\   |   /|   ',
      '   | \\  |  / |   ',
      '  _|__\\_|_/__|_  ',
      ' |  o  o o  o  | ',
      ' |_____________| '
    ],
    /* the sword, for "To M" */
    sword: [
      '            /|   ',
      '           / |   ',
      '          /  |   ',
      '         /   |   ',
      '        /    |   ',
      '   ____/     |   ',
      '  |__________|   ',
      '       |  |      ',
      '       |__|      '
    ],
    /* a heart, in type */
    heart: [
      '   .-\"\"\"\"\"-.   ',
      '  /  _   _  \\  ',
      ' |  (o) (o)  | ',
      ' |     ^     | ',
      ' |    \\_/    | ',
      '  \\         /  ',
      '   \\       /   ',
      '    \\     /    ',
      '     \\   /     ',
      '      \\ /      ',
      '       v       '
    ],
    /* ♀ and ♂, for "To F, to M" — one flips into the other */
    female: [
      '    ___    ',
      '   /   \\   ',
      '  |     |  ',
      '   \\___/   ',
      '     |     ',
      '   __|__   ',
      '     |     ',
      '     |     '
    ],
    male: [
      '      _.-\\ ',
      '    _/   / ',
      '   /   _/  ',
      '  /  _/    ',
      ' |__/      ',
      ' |  |      ',
      ' |__|      '
    ]
  };

  root.PVART = {
    art: ART,
    /* render one as preformatted text lines */
    lines: function (name) { return (ART[name] || ART.cat).slice(); }
  };
})(window);

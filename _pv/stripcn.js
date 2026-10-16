/* Strip cn:/kwcn: from character-art beats: the burnt-in subtitle already shows
   the Chinese, and doubling it puts lyric text back over the artwork. */
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'assets', 'pv-force.js');

let s = fs.readFileSync(P, 'utf8');
let n = 0;
s = s.replace(/\{[^{}]*art:'[a-z]+'[^{}]*\}/g, (m) => {
  const out = m.replace(/,\s*(kw?cn):'[^']*'/g, () => { n++; return ''; });
  return out;
});
fs.writeFileSync(P, s);
console.log('removed', n, 'duplicate cn fields');

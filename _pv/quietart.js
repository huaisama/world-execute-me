/* Every beat carried by CHARACTER ART gets a quiet particle field, so the field
   stays atmosphere instead of spraying a dot cloud behind the words. */
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'assets', 'pv-force.js');

let s = fs.readFileSync(P, 'utf8');
let n = 0;
/* match any txt object that contains art:'...' and inject quiet before its } */
s = s.replace(/\{[^{}]*art:'[a-z]+'[^{}]*\}/g, (m) => {
  if (/quiet:/.test(m)) return m;
  n++;
  return m.replace(/\s*\}$/, ', quiet:.9 }');
});
fs.writeFileSync(P, s);
console.log('quieted', n, 'character-art beats');

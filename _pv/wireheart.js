/* Point the heart-assembly beats at the wedge-aware form. */
const fs = require('fs');
const path = require('path');
const P = path.join(__dirname, '..', 'assets', 'pv-force.js');

let s = fs.readFileSync(P, 'utf8');
let n = 0;
s = s.split(/\r?\n/).map((ln) => {
  if (/'aHeart',\s*'(piece|beat)'/.test(ln) && /pieces:/.test(ln)) {
    n++;
    return ln.replace("'aHeart'", "'aHeartPiece'");
  }
  return ln;
}).join('\n');
fs.writeFileSync(P, s);
console.log('switched', n, 'assemble beats to aHeartPiece');

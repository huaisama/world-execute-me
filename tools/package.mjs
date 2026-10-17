/* ===========================================================================
   package.mjs — build the distributable packages.
   ---------------------------------------------------------------------------
   Produces two staged trees under `dist/`:

     world-execute-me/              the open-source release (NO music)
     world-execute-me-with-audio/   the same, plus the song, for local use

   Run:  node tools/package.mjs
   Then: zip the two folders (the script prints the exact command).

   WHY THE MUSIC IS SPLIT OUT
   --------------------------
   "world.execute(me);" is a commercial track by Mili. This project is a
   non-commercial fan re-interpretation, which CC BY-NC 4.0 covers — but that
   licence covers THIS work, not the song. Redistributing the audio inside a
   public repository would be distributing someone else's copyrighted master,
   so the release tree ships without it and the README explains how to supply
   your own copy. The -with-audio tree exists for private local use only.
   =========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SONG = path.join(ROOT, 'audio', 'world-execute-me.mp3');

/* ---- what goes in ------------------------------------------------------- */
const ROOT_FILES = ['index.html', 'README.md', 'LICENSE', 'CREDITS.md', '.gitignore',
                    '.gitattributes',
                    'start.cmd', 'start.sh'];
const ENTRY = 'index.html';

/* THE ASSET LIST IS DERIVED FROM THE PAGE, NOT GUESSED.
   The first version of this script tried to match the runtime files with the
   pattern /^pv-.*\.js$/ — which does NOT match `pv.js`, because there is no
   hyphen. The main engine was therefore left out of every package, and the
   symptom was nasty: the page loaded, all thirteen layer modules registered,
   and then nothing happened, because the file that drives them was missing.
   It took a 404 sweep to find it.

   Reading the <script>/<link> tags out of the entry document cannot drift:
   whatever the page actually loads is what gets copied. */
function entryAssets() {
  const html = fs.readFileSync(path.join(ROOT, ENTRY), 'utf8');
  const refs = new Set();
  const re = /(?:src|href)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^https?:|^\/\//.test(u)) continue;              /* external  */
    if (u.startsWith('audio/')) continue;                /* handled separately */
    refs.add(u.replace(/^\.\//, ''));
  }
  return [...refs].sort();
}

/* verification tooling: the small scripts only. The audio analysis cache
   (60 MB of wav/npy) and the comparison renders are build artefacts, not
   source. */
function pvToolFiles() {
  return fs.readdirSync(path.join(ROOT, '_pv'))
    .filter(f => /\.(mjs|js|py)$/.test(f))
    .filter(f => !/^_dbg2?\.mjs$/.test(f))     /* scratch debug helpers */
    .sort();
}

/* ---- what stays out, and why ------------------------------------------- */
const EXCLUDED = [
  ['audio/*.mp3',              'copyrighted master — see the note at the top'],
  ['world-execute-me-main/',   'third-party reference project (194 MB), not ours to ship'],
  ['_shot/',                   '44MB of development screenshots'],
  ['_pv/*.wav',                'decoded audio, 60MB, regenerable with ffmpeg'],
  ['_pv/*.npy',                'analysis cache, regenerable'],
  ['_pv/*.png',                'measurement renders, regenerable'],
  ['_pv/*.mp4',                'capture output, regenerable'],
  ['_pv/cmp/',                 'A/B comparison renders'],
  ['_pv/ne/',                  'Natural Earth source data (3.8MB), downloadable'],
  ['*.obj, *.exe',             'build output (the C experiments were removed)'],
  ['新建 文本文档.txt',          'a stray note, not part of the project'],
  ['HANDOFF.md',               'internal session notes, superseded by README.md']
];

/* ---- staging ------------------------------------------------------------ */
/* CLEANING MUST NOT EAT THE GIT REPOSITORY.
   dist/ used to be wiped outright, which deleted dist/world-execute-me/.git
   along with everything else — so every repackage silently destroyed the local
   history of the release tree, and the next push failed with "fatal: not a git
   repository" after the commit had appeared to work.

   The repository is moved OUTSIDE dist/ for the duration. Stashing it anywhere
   inside dist/ does not work — that is precisely the tree being deleted, so the
   copy gets removed along with the original. */
/* The stash must live on the SAME VOLUME as dist/. os.tmpdir() is on C: while
   this project is on D:, and fs.renameSync across drives fails with EXDEV —
   'cross-device link not permitted'. Keeping it beside dist/ is enough: it only
   has to be outside the tree being deleted. */
const GITSTASH = path.join(ROOT, '.gitstash');

function clean(dir) {
  fs.rmSync(GITSTASH, { recursive: true, force: true });
  const saved = [];
  if (fs.existsSync(dir)) {
    for (const sub of fs.readdirSync(dir)) {
      const g = path.join(dir, sub, '.git');
      if (fs.existsSync(g)) {
        const dest = path.join(GITSTASH, sub);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(g, dest);
        saved.push([dest, g, sub]);
      }
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const [dest, g] of saved) {
    fs.mkdirSync(path.dirname(g), { recursive: true });
    fs.renameSync(dest, g);
  }
  fs.rmSync(GITSTASH, { recursive: true, force: true });
  if (saved.length) {
    console.log('  kept git repo(s): ' + saved.map(s => s[2]).join(', '));
  }
}
function put(dir, rel) {
  const src = path.join(ROOT, rel), dst = path.join(dir, rel);
  if (!fs.existsSync(src)) { console.log('   MISSING ' + rel); return 0; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return fs.statSync(dst).size;
}

function stage(into, withAudio) {
  console.log('\n  staging ' + path.relative(ROOT, into));
  let bytes = 0, count = 0;
  const add = rel => { const n = put(into, rel); if (n) { bytes += n; count++; } };

  ROOT_FILES.forEach(add);
  entryAssets().forEach(add);
  add(path.join('tools', 'serve.py'));
  add(path.join('tools', 'package.mjs'));
  pvToolFiles().forEach(f => add(path.join('_pv', f)));

  /* the country outlines the generator reads; small and needed to rebuild */
  const geo = path.join(ROOT, '_pv', 'geo');
  if (fs.existsSync(geo)) {
    for (const f of fs.readdirSync(geo)) add(path.join('_pv', 'geo', f));
  }

  /* the README gallery. These are the first thing anyone sees on the project
     page, so they belong in the repo even though they are the largest files in
     it — a visual piece with no images gets scrolled past. */
  const docs = path.join(ROOT, 'docs');
  if (fs.existsSync(docs)) {
    for (const f of fs.readdirSync(docs)) add(path.join('docs', f));
  }

  /* audio slot */
  const audioDir = path.join(into, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  if (withAudio) {
    if (fs.existsSync(SONG)) {
      fs.copyFileSync(SONG, path.join(audioDir, 'world-execute-me.mp3'));
      const n = fs.statSync(path.join(audioDir, 'world-execute-me.mp3')).size;
      bytes += n; count++;
      console.log('   + audio/world-execute-me.mp3  (PRIVATE LOCAL USE ONLY)');
    } else {
      console.log('   ! audio/world-execute-me.mp3 not found — package will be silent');
    }
  } else {
    fs.writeFileSync(path.join(audioDir, 'PUT-THE-SONG-HERE.md'), AUDIO_NOTE, 'utf8');
    count++; bytes += Buffer.byteLength(AUDIO_NOTE);
  }

  console.log(`   ${count} files, ${(bytes / 1048576).toFixed(2)} MB`);
  return { count, bytes };
}

/* ---------------------------------------------------------------------------
   SELF-CHECK. Every resource the entry page references must exist in the
   staged tree. This is the guard that was missing: without it, a package that
   silently omitted the main engine looked perfectly fine right up until it was
   opened.
   --------------------------------------------------------------------------- */
function verify(into) {
  const html = fs.readFileSync(path.join(into, ENTRY), 'utf8');
  const re = /(?:src|href)\s*=\s*"([^"]+)"/g;
  const missing = [];
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^https?:|^\/\//.test(u)) continue;
    if (u.startsWith('audio/')) continue;                 /* optional by design */
    if (!fs.existsSync(path.join(into, u.replace(/^\.\//, '')))) missing.push(u);
  }
  return missing;
}

const AUDIO_NOTE = `# audio/

This folder is intentionally empty in the public release.

The piece this project re-interprets is **"world.execute(me);" by Mili**, which
is commercially released and copyrighted. It is not mine to redistribute, so the
open-source package ships without it.

## To run the project

Put an audio file named exactly this next to this file:

    world-execute-me.mp3

If you own the track, rip or copy it here. The visualisation is timed to that
specific recording — the score in \`assets/pv-data.js\` encodes absolute
timestamps measured from it (duration 211.96 s, tempo 130.83 BPM). A different
master, a different edit, or a live version will drift out of sync.

## Without the file

The page still runs. It detects that the audio is unavailable and falls back to
an internal clock, so you can see the whole piece — you just will not hear it.
`;

/* ---- run ---------------------------------------------------------------- */
console.log('world.execute(me);  —  packaging');
console.log('  source ' + ROOT);

clean(DIST);
const publicTree = stage(path.join(DIST, 'world-execute-me'), false);
const localTree = stage(path.join(DIST, 'world-execute-me-with-audio'), true);

/* fail loudly rather than shipping something that cannot start */
let broken = false;
for (const dir of ['world-execute-me', 'world-execute-me-with-audio']) {
  const missing = verify(path.join(DIST, dir));
  if (missing.length) {
    broken = true;
    console.log(`\n  !! ${dir} is INCOMPLETE — the page references files that are not there:`);
    missing.forEach(f => console.log('       ' + f));
  } else {
    console.log(`\n  ok  ${dir}: every referenced resource is present`);
  }
}
if (broken) {
  console.log('\n  packaging FAILED — fix the missing files before publishing.\n');
  process.exit(1);
}

console.log('\n  excluded:');
for (const [what, why] of EXCLUDED) console.log(`    ${what.padEnd(26)} ${why}`);

console.log('\n  zipping:');
console.log('    Compress-Archive -Path dist\\world-execute-me\\*             -DestinationPath dist\\world-execute-me-nc.zip');
console.log('    Compress-Archive -Path dist\\world-execute-me-with-audio\\*  -DestinationPath dist\\world-execute-me-with-audio.zip');
console.log('\n  to publish the open-source tree:');
console.log('    cd dist\\world-execute-me && git init && git add -A && git commit -m "world.execute(me); — HTML recreation"');
console.log('\n  done.');

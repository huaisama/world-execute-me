# audio/

This folder is intentionally empty in the public release.

The piece this project re-interprets is **"world.execute(me);" by Mili**, which
is commercially released and copyrighted. It is not mine to redistribute, so the
open-source package ships without it.

## To run the project

Put an audio file named exactly this next to this file:

    world-execute-me.mp3

If you own the track, rip or copy it here. The visualisation is timed to that
specific recording — the score in `assets/pv-data.js` encodes absolute
timestamps measured from it (duration 211.96 s, tempo 130.83 BPM). A different
master, a different edit, or a live version will drift out of sync.

## Without the file

The page still runs. It detects that the audio is unavailable and falls back to
an internal clock, so you can see the whole piece — you just will not hear it.

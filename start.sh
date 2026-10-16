#!/usr/bin/env bash
# ===========================================================================
#  start.sh — run world.execute(me); locally (macOS / Linux)
#
#  Same job as start.cmd. Finds Python 3, starts the Range-capable server and
#  opens the piece in your browser.
#
#  Why a server, and why THIS one: <audio> seeking needs HTTP Range requests.
#  `python -m http.server` ignores Range and answers 200 with the whole file,
#  so playback works but the timeline quietly stops being seekable.
#  tools/serve.py answers real 206s — that is the only reason it exists.
#
#  Usage:  ./start.sh          (port 8899)
#          ./start.sh 9000     (a different port)
#  Stop:   Ctrl+C
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"

PORT="${1:-8899}"

echo
echo "  world.execute(me);"
echo "  ------------------------------------------"
echo

# ---- find a Python 3 -------------------------------------------------------
PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null 2>&1; then
    if "$c" -c 'import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)' >/dev/null 2>&1; then
      PY="$c"; break
    fi
  fi
done

if [ -z "$PY" ]; then
  echo "  No Python 3 found."
  echo
  echo "  macOS:  brew install python3"
  echo "  Debian: sudo apt install python3"
  echo
  exit 1
fi
echo "  python    $PY"

# ---- the song is optional, but say so rather than let it look broken -------
if [ -f "audio/world-execute-me.mp3" ]; then
  echo "  audio     found"
else
  echo "  audio     NOT FOUND"
  echo
  echo "  The piece will run silently and fall back to its internal clock."
  echo "  To hear it, put your own copy of the track at:"
  echo "      audio/world-execute-me.mp3"
  echo "  See CREDITS.md — the song is Mili's and is not redistributed here."
  echo
fi

echo "  serving   $(pwd)"
echo "  address   http://127.0.0.1:$PORT/"
echo
echo "  Ctrl+C stops the server."
echo

# ---- open the browser once the server is up -------------------------------
#  A short delay rather than polling: the server binds almost immediately, and
#  this avoids the "connection refused" tab when the browser wins the race.
(
  sleep 2
  URL="http://127.0.0.1:$PORT/"
  if command -v open >/dev/null 2>&1;       then open "$URL"        # macOS
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"    # Linux
  else echo "  open $URL in your browser"
  fi
) &

# ---- run the server in the foreground so Ctrl+C is the off switch ----------
exec "$PY" tools/serve.py "$PORT"

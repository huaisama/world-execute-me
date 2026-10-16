#!/usr/bin/env python3
"""Static server for this project.

Why not `python -m http.server`?  SimpleHTTPRequestHandler answers a Range
request with 200 and the whole body and never sends `Accept-Ranges`, so Chrome
classifies the <audio> element as a *non-seekable stream*: assigning
`audio.currentTime` is silently ignored. That breaks the progress bar and the
`?t=` deep link. This handler implements real 206 Partial Content.

    python tools/serve.py [port]        # default 8899
"""
import http.server
import mimetypes
import os
import re
import socket
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8899

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('text/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('audio/mpeg', '.mp3')


class _Slice:
    """File-like wrapper that yields at most `n` bytes (for 206 responses)."""

    def __init__(self, fp, n):
        self.fp = fp
        self.n = n

    def read(self, k=-1):
        if self.n <= 0:
            return b''
        if k is None or k < 0 or k > self.n:
            k = self.n
        data = self.fp.read(k)
        self.n -= len(data)
        return data

    def close(self):
        self.fp.close()


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get('Range')
        if not rng or not os.path.isfile(path):
            return super().send_head()

        m = re.match(r'bytes=(\d*)-(\d*)\s*$', rng)
        if not m:
            return super().send_head()

        size = os.path.getsize(path)
        first, last = m.group(1), m.group(2)
        if first == '':
            if last == '':
                return super().send_head()
            start, end = max(0, size - int(last)), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */%d' % size)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None

        fp = open(path, 'rb')
        fp.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Last-Modified', self.date_time_string(os.path.getmtime(path)))
        self.end_headers()
        return _Slice(fp, end - start + 1)

    def log_message(self, fmt, *args):
        pass          # keep the console quiet


class Server(socketserver.ThreadingTCPServer):
    # NOTE: keep SO_REUSEADDR (restarts are painless) and rely on the preflight
    # check below instead — two servers silently sharing one port on Windows is
    # the failure mode we actually care about, and SO_EXCLUSIVEADDRUSE cannot be
    # combined with SO_REUSEADDR (WinError 10022).
    allow_reuse_address = True
    daemon_threads = True


def already_serving(port):
    s = socket.socket()
    s.settimeout(.35)
    try:
        s.connect(('127.0.0.1', port))
        return True
    except OSError:
        return False
    finally:
        s.close()


if __name__ == '__main__':
    if already_serving(PORT):
        sys.stderr.write(
            'port %d is already taken by another server.\n'
            'If that is `python -m http.server`, it does NOT support Range requests,\n'
            'so <audio> becomes a non-seekable stream and the progress bar dies.\n'
            'Stop it first, then run this again.\n' % PORT)
        sys.exit(2)
    with Server(('127.0.0.1', PORT), Handler) as httpd:
        print('serving %s\n  http://127.0.0.1:%d/pv.html' % (ROOT, PORT), flush=True)
        httpd.serve_forever()

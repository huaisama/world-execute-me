"""Assemble recorded frames into a clip with the matching slice of the real audio.

Usage: mkmovie.py <out_name> <audio_start_seconds>
"""
import json, os, subprocess, sys

ROOT = r'D:\deepseek发挥\yz'
DIR = os.path.join(os.environ['TEMP'], 'pvframes')
NAME = sys.argv[1] if len(sys.argv) > 1 else 'pv_motion.mp4'
A0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
OUT = os.path.join(ROOT, '_shot', NAME)
AUD = os.path.join(ROOT, 'audio', 'world-execute-me.mp3')

times = json.load(open(os.path.join(DIR, 'times.json')))
n = len(times)
lines = ['ffconcat version 1.0']
for i in range(n):
    dur = (times[i + 1] - times[i]) / 1000.0 if i + 1 < n else (times[i] - times[i - 1]) / 1000.0
    lines.append("file '%s\\f%04d.jpg'" % (DIR.replace('\\', '/'), i))
    lines.append('duration %.4f' % dur)
lines.append("file '%s\\f%04d.jpg'" % (DIR.replace('\\', '/'), n - 1))
lst = os.path.join(DIR, 'list.txt')
open(lst, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

span = times[-1] / 1000.0
cmd = ['ffmpeg', '-y', '-v', 'error',
       '-f', 'concat', '-safe', '0', '-i', lst,
       '-ss', '%.3f' % A0, '-i', AUD, '-t', '%.2f' % span,
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
       '-r', '25', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print(OUT, os.path.getsize(OUT), 'bytes', 'frames', n, 'span %.2fs' % span)

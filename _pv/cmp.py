"""Assemble PV-vs-recreation comparison sheets.

Each cell = [ PV frame | my render ] at 480x270, 2 cells per row, 3 rows per sheet.
PV is offset by +0.215s because the bilibili upload runs 0.215s ahead of the mp3.
"""
import os, sys, subprocess
import numpy as np
from PIL import Image

ROOT = r'D:\deepseek发挥\yz'
PV   = os.path.join(ROOT, '_pv', 'pv.mp4')
MINE = os.path.join(os.environ.get('TEMP', r'C:\Windows\Temp'), 'pvshot')
WORK = os.path.join(ROOT, '_pv', 'cmp')
os.makedirs(WORK, exist_ok=True)

CW, CH = 480, 270          # cell size
COLS, ROWS = 2, 3          # cells per sheet
OFF = 0.215                # pv clock = mp3 clock + OFF


def pv_frame(t, path):
    if not os.path.exists(path):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '%.3f' % (float(t) + OFF),
                        '-i', PV, '-frames:v', '1', path], check=True)
    return Image.open(path).convert('RGB').resize((CW, CH), Image.LANCZOS)


def mine_frame(t, path):
    if not os.path.exists(path):
        return None
    return Image.open(path).convert('RGB').resize((CW, CH), Image.LANCZOS)


def label(im, text, color=(255, 90, 90)):
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 7 * len(text), 16], fill=(0, 0, 0))
    d.text((4, 3), text, fill=color)
    return im


def build(times, name):
    per = COLS * ROWS
    sheets = []
    for s in range(0, len(times), per):
        chunk = times[s:s + per]
        canvas = Image.new('RGB', (COLS * CW * 2 + COLS * 6, ROWS * CH + ROWS * 6), (24, 24, 26))
        for k, t in enumerate(chunk):
            r, c = divmod(k, COLS)
            x = c * (CW * 2 + 6)
            y = r * (CH + 6)
            pf = pv_frame(t, os.path.join(WORK, 'pv_%s.png' % t))
            mf = mine_frame(t, os.path.join(MINE, 'm_%s.png' % t))
            canvas.paste(label(pf.copy(), 'PV %s' % t), (x, y))
            if mf is None:
                mf = Image.new('RGB', (CW, CH), (60, 0, 0))
            canvas.paste(label(mf.copy(), 'MINE %s' % t, (120, 220, 255)), (x + CW + 6, y))
        p = os.path.join(WORK, '%s_%d.png' % (name, len(sheets) + 1))
        canvas.save(p)
        sheets.append(p)
    return sheets


if __name__ == '__main__':
    times = [x.strip() for x in sys.argv[1].split(',') if x.strip()]
    for p in build(times, sys.argv[2] if len(sys.argv) > 2 else 'cmp'):
        print(p)

"""Build the showcase assets that go in _shot/ (deliverable-adjacent visuals)."""
import os, subprocess
import numpy as np
from PIL import Image, ImageDraw

ROOT = r'D:\deepseek发挥\yz'
PV = os.path.join(ROOT, '_pv', 'pv.mp4')
MINE = os.path.join(os.environ.get('TEMP', r'C:\Windows\Temp'), 'pvshot')
SHOT = os.path.join(ROOT, '_shot')
WORK = os.path.join(ROOT, '_pv', 'cmp')
os.makedirs(SHOT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)
OFF = 0.215


def pv(t, box, size):
    p = os.path.join(WORK, 'sv_pv_%s.png' % t)
    if not os.path.exists(p):
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '%.3f' % (float(t) + OFF),
                        '-i', PV, '-frames:v', '1', p], check=True)
    return Image.open(p).convert('RGB').resize(size, Image.LANCZOS)


def mine(t, size):
    p = os.path.join(MINE, 'm_%s.png' % t)
    return Image.open(p).convert('RGB').resize(size, Image.LANCZOS)


def tag(im, text, col):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 9 + 8 * len(text), 18], fill=(0, 0, 0))
    d.text((5, 4), text, fill=col)
    return im


def pair_sheet(times, name, cw=640, ch=360, cols=2):
    rows = (len(times) + cols - 1) // cols
    c = Image.new('RGB', (cols * (cw * 2 + 8) + 8, rows * (ch + 8) + 8), (18, 18, 20))
    for k, t in enumerate(times):
        r, cc = divmod(k, cols)
        x = 8 + cc * (cw * 2 + 8)
        y = 8 + r * (ch + 8)
        c.paste(tag(pv(t, (0, 0, 0, 0), (cw, ch)), 'PV %ss' % t, (255, 96, 96)), (x, y))
        c.paste(tag(mine(t, (cw, ch)), 'HTML %ss' % t, (120, 220, 255)), (x + cw + 8, y))
    out = os.path.join(SHOT, name)
    c.save(out)
    return out


def overview(times, name, cw=480, ch=270, cols=4):
    rows = (len(times) + cols - 1) // cols
    c = Image.new('RGB', (cols * cw + (cols + 1) * 6, rows * ch + (rows + 1) * 6), (12, 12, 14))
    for k, t in enumerate(times):
        r, cc = divmod(k, cols)
        c.paste(mine(t, (cw, ch)), (6 + cc * (cw + 6), 6 + r * (ch + 6)))
    out = os.path.join(SHOT, name)
    c.save(out)
    return out


if __name__ == '__main__':
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if which in ('all', 'comp'):
        print(pair_sheet(['2.0', '18.0', '35.5', '45.0', '65.0', '71.0'], 'pv_compare_1.png'))
        print(pair_sheet(['89.0', '96.0', '111.0', '123.3', '148.0', '161.0'], 'pv_compare_2.png'))
        print(pair_sheet(['174.0', '177.5', '190.8', '206.0'], 'pv_compare_3.png'))
    if which in ('all', 'over'):
        print(overview(['2.0', '13.0', '18.0', '30.0', '35.5', '45.0', '51.5', '59.5',
                        '65.0', '71.0', '74.5', '81.5', '89.0', '96.0', '101.5', '107.5',
                        '111.0', '123.3', '126.0', '148.0', '159.0', '161.0', '170.5', '174.0',
                        '177.5', '181.5', '188.5', '190.8', '206.0', '210.5', '62.5', '120.5'],
                       'pv_overview.png'))

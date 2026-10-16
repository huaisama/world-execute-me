import numpy as np, sys, subprocess, os
from PIL import Image

PV = r'D:\deepseek发挥\yz\_pv\pv.mp4'

def frame(t, out):
    if not os.path.exists(out):
        subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',PV,'-frames:v','1',out], check=True)
    return np.asarray(Image.open(out).convert('L')).astype(np.int16)

def report(t, label):
    out = r'D:\deepseek发挥\yz\_pv\f_%s.png' % label
    a = frame(t, out)
    H, W = a.shape
    print('=== t=%s  %dx%d ===' % (t, W, H))
    # column profile to find horizontal extent of text
    def band(y0, y1, thr=90):
        sub = a[y0:y1]
        rows = (sub > thr).sum(axis=1)
        ys = np.where(rows > 2)[0]
        if len(ys) == 0:
            print('  band %d-%d: empty' % (y0, y1)); return
        # group contiguous rows
        groups, start = [], ys[0]
        for i in range(1, len(ys)):
            if ys[i] != ys[i-1] + 1:
                groups.append((start, ys[i-1])); start = ys[i]
        groups.append((start, ys[-1]))
        for g in groups:
            seg = sub[g[0]:g[1]+1]
            cols = (seg > thr).sum(axis=0)
            xs = np.where(cols > 0)[0]
            print('  text rows y=%d..%d (h=%d)  x=%d..%d (w=%d)  cx=%.1f'
                  % (y0+g[0], y0+g[1], g[1]-g[0]+1, xs[0], xs[-1], xs[-1]-xs[0]+1, (xs[0]+xs[-1])/2))
    # bottom subtitle region (native 640x360); report x3 for a 1920x1080 stage
    band(275, 355)
    print('  -- whole frame text --')
    band(0, 275)

for t, lab in [(30.6,'points'), (18.0,'title'), (46.6,'acdc'), (101.5,'trance'), (87.5,'god')]:
    report(t, lab)

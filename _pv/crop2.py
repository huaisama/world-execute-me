import numpy as np, subprocess, os
from PIL import Image

PV = r'D:\deepseek发挥\yz\_pv\pv.mp4'
OUT = r'D:\deepseek发挥\yz\_pv'

def frame(t):
    p = os.path.join(OUT, 'g_%.1f.png' % t)
    if not os.path.exists(p):
        subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',PV,'-frames:v','1',p], check=True)
    return Image.open(p).convert('RGB')

def strip(t, box, w=1920):
    im = frame(t).crop(box)
    h = int(im.height * w / im.width)
    return np.asarray(im.resize((w, h), Image.LANCZOS))

parts = [
    strip(23.0, (150, 100, 500, 250)),      # title card
    strip(90.6, (40, 60, 640, 150)),        # [Configuration] tag + gender
    strip(140.0, (0, 235, 340, 350)),       # terminal log
    strip(150.0, (200, 90, 450, 170)),      # Execution big
]
W = 1920
tot = sum(p.shape[0] for p in parts)
canvas = np.full((tot, W, 3), 255, np.uint8)
y = 0
for p in parts:
    canvas[y:y+p.shape[0], :p.shape[1]] = p
    y += p.shape[0]
Image.fromarray(canvas).save(os.path.join(OUT, 'm_type.png'))
print('ok', canvas.shape)

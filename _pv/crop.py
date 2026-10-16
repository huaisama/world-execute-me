import numpy as np, subprocess, os
from PIL import Image

PV = r'D:\deepseek发挥\yz\_pv\pv.mp4'
OUT = r'D:\deepseek发挥\yz\_pv'

def frame(t):
    p = os.path.join(OUT, 'g_%.1f.png' % t)
    if not os.path.exists(p):
        subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',PV,'-frames:v','1',p], check=True)
    return Image.open(p).convert('RGB')

# bottom subtitle strip, blown up 3x
strips = []
for t in (30.6, 46.6, 101.5, 125.5):
    im = frame(t).crop((0, 296, 640, 360)).resize((1920, 192), Image.LANCZOS)
    strips.append(np.asarray(im))
Image.fromarray(np.vstack(strips)).save(os.path.join(OUT, 'm_subs.png'))

# title card
Image.fromarray(np.asarray(frame(18.0).crop((150, 120, 490, 250)).resize((1360, 520), Image.LANCZOS))).save(os.path.join(OUT, 'm_title.png'))
print('ok')

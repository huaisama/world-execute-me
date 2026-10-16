import os
from PIL import Image
T = os.path.join(os.environ['TEMP'], 'pvshot')
OUT = r'D:\deepseek发挥\yz\_pv'
jobs = [('m_111.0.png', (560, 340, 1040, 440), 3), ('m_159.0.png', (500, 230, 1100, 330), 3)]
ims = []
for f, box, z in jobs:
    im = Image.open(os.path.join(T, f)).convert('RGB').crop(box)
    ims.append(im.resize((im.width * z, im.height * z), Image.NEAREST))
W = max(i.width for i in ims)
H = sum(i.height for i in ims) + 10
c = Image.new('RGB', (W, H), (30, 30, 30))
y = 0
for i in ims:
    c.paste(i, (0, y)); y += i.height + 10
c.save(os.path.join(OUT, 'zoom_pills.png'))
print('ok', c.size)

"""Fine-resolution vocal envelope, so the actual sung syllables of "LO-O-OVE"
can be read off directly.

Prints one character per 25ms with a time ruler, plus the peak times found by
local-maximum picking. This is the measurement that decides where the heart's
pieces land; the lyric sheet only gives line starts, and putting fill-steps at
line starts is exactly why the timing felt wrong.
"""
import sys, wave
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else r'_pv\full.wav'
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 178.5
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 193.0
per = float(sys.argv[4]) if len(sys.argv) > 4 else 0.025

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
w.setpos(int(t0 * sr))
raw = w.readframes(min(n, int(t1 * sr)) - int(t0 * sr))
w.close()
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
if ch == 2: x = x.reshape(-1, 2).mean(axis=1)

win = 1024; hop = 110
nfr = 1 + (len(x) - win) // hop
window = np.hanning(win)
freqs = np.fft.rfftfreq(win, 1.0 / sr)
band = (freqs >= 300) & (freqs <= 3400)

E = np.empty(nfr)
for i in range(nfr):
    S = np.abs(np.fft.rfft(x[i*hop: i*hop+win] * window))
    E[i] = S[band].sum()
E = E / (E.max() + 1e-9)

# envelope follower (attack fast, release slow) so syllables read as blobs
env = np.empty(nfr)
a = 0.0
for i in range(nfr):
    a = max(E[i], a * 0.90)
    env[i] = a
env = env / (env.max() + 1e-9)

step = max(1, int(per * sr / hop))
chars = ' .:-=+*#@'
rows = []
labels = []
for j in range(0, nfr, step):
    e = env[j:j+step].max()
    rows.append(chars[min(8, int(e * 9))])
    t = t0 + j * hop / sr
    labels.append(t)

# print in blocks of 100 chars with a time ruler
BLK = 100
print(f'\n=== vocal envelope {t0}..{t1}, 1 char = {per*1000:.0f}ms ===')
for s in range(0, len(rows), BLK):
    seg = rows[s:s+B+0] if False else rows[s:s+BLK]
    ts = labels[s:s+BLK]
    print('  ' + ''.join(seg))
    # ruler: mark each whole second and each 0.5s
    r = ''
    for t in ts:
        frac = t - int(t)
        if abs(frac) < per / 2 or abs(frac - 1) < per / 2:
            r += '|'
        elif abs(frac - 0.5) < per / 2:
            r += '+'
        else:
            r += ' '
    print('  ' + r)
    print('   t=' + f'{ts[0]:.2f}' + ' ' * (BLK - 16) + f'{ts[-1]:.2f}')
    print()

# local maxima of the raw envelope = syllable cores
peaks = []
for i in range(2, nfr - 2):
    if env[i] > 0.22 and env[i] >= env[i-1] and env[i] >= env[i+1] and env[i] > env[i-2] and env[i] > env[i+2]:
        t = t0 + i * hop / sr
        if not peaks or t - peaks[-1][0] > 0.13:
            peaks.append((t, env[i]))
print(f'{len(peaks)} syllable peaks (env > 0.22, >=130ms apart):')
for t, v in peaks:
    print(f'  {t:8.3f}   {v:.3f}  {"#"*int(v*40)}')

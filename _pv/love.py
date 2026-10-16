"""The actual sung onsets in the love section, at high resolution.

Rather than trusting a beat grid (whose anchor is uncertain by ~0.15s, enough to
put every fill visibly off), find the ONSETS themselves and land the heart on
those. Prints onset times with strength, and the four strongest clusters, which
are where "LO-O-OVE" is actually sung.
"""
import sys, wave
import numpy as np

path = r'_pv\st.wav'
t0, t1 = 177.5, 193.5

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes()
w.rewind()
raw = w.readframes(n)
w.close()
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
x = x.reshape(-1, 2)
mid = (x[:, 0] + x[:, 1]) / 2
side = (x[:, 0] - x[:, 1]) / 2
v = mid - 0.55 * side

a = int(t0 * sr); b = int(t1 * sr)
seg = v[a:b]

win = 1024; hop = 128
nfr = 1 + (len(seg) - win) // hop
window = np.hanning(win)
S = np.empty((nfr, win // 2 + 1))
for i in range(nfr):
    S[i] = np.abs(np.fft.rfft(seg[i*hop: i*hop+win] * window))
fr = np.fft.rfftfreq(win, 1.0 / sr)
band = (fr >= 300) & (fr <= 3400)
L = np.log1p(S[:, band] * 80)
d = np.diff(L, axis=0)
oss = np.maximum(d, 0).sum(axis=1)
oss = np.concatenate([[0], oss])
oss = oss / (oss.max() + 1e-9)
fps = sr / hop
print(f'{fps:.1f} frames/s, {nfr} frames')

# adaptive threshold
wlen = int(0.35 * fps)
pad = np.pad(oss, wlen // 2, mode='edge')
thr = np.array([pad[i:i+wlen].mean() for i in range(nfr)]) * 1.30 + 0.010

peaks = []
last = -1e9
for i in range(1, nfr - 1):
    t = t0 + i / fps
    if (oss[i] > thr[i] and oss[i] >= oss[i-1] and oss[i] > oss[i+1]
            and t - last >= 0.11):
        peaks.append((t, oss[i]))
        last = t

print(f'\n{len(peaks)} onsets in {t0}..{t1}:\n')
for t, val in peaks:
    print(f'  {t:8.3f}  {val:.3f}  {"#"*int(val*50)}')

print('\nstrongest 24:')
for t, val in sorted(peaks, key=lambda z: -z[1])[:24]:
    print(f'  {t:8.3f}  {val:.3f}')

# fine envelope strip, 20ms per char
print(f'\n=== onset strength, 1 char = 20ms ===')
step = max(1, int(0.020 * fps))
rows = []; labels = []
for j in range(0, nfr, step):
    rows.append(' .:-=+*#@'[min(8, int(oss[j:j+step].max() * 9))])
    labels.append(t0 + j / fps)
BLK = 120
for s in range(0, len(rows), BLK):
    seg2 = rows[s:s+BLK]; ts = labels[s:s+BLK]
    print('  ' + ''.join(seg2))
    r = ''
    for t in ts:
        f = t - int(t)
        r += '|' if f < .02 or f > .98 else ('+' if abs(f-.5) < .02 else ' ')
    print('  ' + r)
    print('   t=' + f'{ts[0]:.2f}' + ' ' * max(0, BLK-16) + f'{ts[-1]:.2f}')
    print()

"""Tempo and beat grid of the love section.

"卡的点不是很舒服" is a complaint about TIMING, and the fill times in the score
are 179.90 / 183.50 / 186.30 / 191.30 — gaps of 3.6s, 2.8s, 5.0s, which is
irregular by construction. Those came from the lyric sheet's line starts.

What the fill should actually land on is the MUSICAL BEAT. So measure it:
onset strength envelope -> autocorrelation -> tempo -> phase -> beat times.
"""
import sys, wave
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else r'_pv\full.wav'
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 175.0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 196.0

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
w.setpos(int(t0 * sr))
raw = w.readframes(min(n, int(t1 * sr)) - int(t0 * sr))
w.close()
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
if ch == 2: x = x.reshape(-1, 2).mean(axis=1)

# --- onset strength envelope (spectral flux over the whole band) -----------
win = 1024; hop = 256
nfr = 1 + (len(x) - win) // hop
window = np.hanning(win)
S = np.empty((nfr, win // 2 + 1))
for i in range(nfr):
    S[i] = np.abs(np.fft.rfft(x[i*hop: i*hop+win] * window))
L = np.log1p(S * 60)
d = np.diff(L, axis=0)
oss = np.maximum(d, 0).sum(axis=1)
oss = np.concatenate([[0], oss])
oss = oss / (oss.max() + 1e-9)
fps = sr / hop                      # frames per second

# --- tempo by autocorrelation of the onset envelope ------------------------
o = oss - oss.mean()
ac = np.correlate(o, o, mode='full')[len(o)-1:]
ac = ac / (ac[0] + 1e-9)
lo = int(0.30 * fps)                # 200 BPM
hi = int(1.00 * fps)                #  60 BPM
seg = ac[lo:hi]
best = lo + int(np.argmax(seg))
bpm = 60.0 * fps / best
print(f'tempo: {bpm:.2f} BPM   (lag {best} frames = {best/fps:.3f}s)')

# refine: check integer multiples, prefer the one with the strongest comb
print('\ncomb scores around that period:')
for mult in [0.5, 1, 2, 3]:
    p = int(best * mult)
    if p >= len(ac): continue
    sc = sum(ac[min(len(ac)-1, p * k)] for k in range(1, 5))
    print(f'  x{mult:<4} period {p/fps:.3f}s  ({60*fps/p:6.2f} BPM)  comb {sc:.3f}')

# --- phase: cross-correlate a click train with the onset envelope ----------
period = best
best_phase = 0; best_score = -1
for ph in range(period):
    idx = np.arange(ph, nfr, period).astype(int)
    sc = oss[idx].sum()
    if sc > best_score:
        best_score = sc; best_phase = ph

print(f'\nphase: {best_phase} frames = {best_phase/fps:.3f}s')

print(f'\n=== beat grid {t0}..{t1} ===')
beats = []
i = best_phase
k = 0
while i < nfr:
    t = t0 + i / fps
    beats.append(t)
    i += period; k += 1
for j, t in enumerate(beats):
    strength = oss[min(nfr-1, best_phase + j*period)]
    bar = '#' * int(strength * 60)
    downbeat = (j % 4 == 0)
    print(f'  {t:8.3f}  {"[1]" if downbeat else "   "} {strength:.3f} {bar}')

# --- also print the envelope so the grid can be eyeballed against it -------
print(f'\n=== onset strength (1 char = 50ms) ===')
step = max(1, int(0.05 * fps))
rows = []
labels = []
for j in range(0, nfr, step):
    e = oss[j:j+step].max()
    rows.append(' .:-=+*#@'[min(8, int(e * 9))])
    labels.append(t0 + j / fps)
BLK = 100
for s in range(0, len(rows), BLK):
    seg = rows[s:s+BLK]; ts = labels[s:s+BLK]
    print('  ' + ''.join(seg))
    r = ''
    for t in ts:
        f = t - int(t)
        r += '|' if f < .05 or f > .95 else ('+' if abs(f-.5) < .05 else ' ')
    print('  ' + r)
    print('   t=' + f'{ts[0]:.2f}' + ' ' * max(0, BLK-16) + f'{ts[-1]:.2f}')
    print()

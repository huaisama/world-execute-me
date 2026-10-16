"""Dense rhythm map of the love section, so the heart's fill can land on the
syllables that are actually SUNG rather than on the lyric sheet's line starts.

Prints, for each 40ms frame: vocal-band energy, and marks detected onsets.
"""
import sys, wave
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else r'_pv\full.wav'
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 178.0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 193.0

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
w.setpos(int(t0 * sr))
raw = w.readframes(min(n, int(t1 * sr)) - int(t0 * sr))
w.close()
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
if ch == 2: x = x.reshape(-1, 2).mean(axis=1)

win = 2048; hop = 441          # ~10ms hop
nfr = 1 + (len(x) - win) // hop
window = np.hanning(win)
freqs = np.fft.rfftfreq(win, 1.0 / sr)
band = (freqs >= 250) & (freqs <= 3500)      # vocal formant region

E = np.empty(nfr)
for i in range(nfr):
    seg = x[i*hop: i*hop+win] * window
    S = np.abs(np.fft.rfft(seg))
    E[i] = S[band].sum()

E = E / (E.max() + 1e-9)
# smooth
k = np.ones(5) / 5
Es = np.convolve(E, k, mode='same')

# onset = rising edge of the vocal envelope
d = np.diff(Es)
d = np.maximum(d, 0)
d = np.convolve(d, np.ones(3)/3, mode='same')

wlen = int(0.30 * sr / hop)
pad = np.pad(d, wlen//2, mode='edge')
thr = np.array([pad[i:i+wlen].mean() for i in range(len(d))]) * 1.6 + 0.006

ons = []
last = -1e9
for i in range(1, len(d)-1):
    t = t0 + i*hop/sr
    if d[i] > thr[i] and d[i] >= d[i-1] and d[i] > d[i+1] and t - last >= 0.14:
        ons.append((t, d[i], Es[i]))
        last = t

# ASCII energy strip, 1 char per 100ms
print(f'\n=== vocal energy {t0}..{t1}  (1 char = 100ms) ===')
step = int(0.10 * sr / hop)
marks = {round(t, 2): i for i, (t, _, _) in enumerate(ons)}
line = ''
tlabel = ''
for j in range(0, nfr, step):
    e = Es[j:j+step].max()
    ch_ = ' .:-=+*#@'[min(8, int(e * 9))]
    line += ch_
print('  ' + line)
# ruler
ruler = ''
for j in range(0, nfr, step):
    t = t0 + j*hop/sr
    ruler += ('|' if abs(t - round(t)) < 0.05 else ' ')
print('  ' + ruler)

print(f'\n{len(ons)} onsets:')
for t, v, e in ons:
    bar = '#' * int(v * 120)
    print(f'  {t:8.3f}  env {e:.2f}  {bar}')

"""Vocal-isolated syllable map of the love section.

The full mix saturates any envelope, so the syllables are not readable from it
(every peak came out ~0.5). The lead vocal is CENTRED in this mix, so
mid/side extraction — keep (L+R)/2, subtract the sides — suppresses the wide
instrumental bed and leaves the voice.

Output: one char per 25ms, plus the syllable cores.
"""
import sys, wave
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else r'_pv\st.wav'
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 178.5
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 193.0

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
w.setpos(int(t0 * sr))
raw = w.readframes(min(n, int(t1 * sr)) - int(t0 * sr))
w.close()
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
x = x.reshape(-1, 2)
L = x[:, 0]; R = x[:, 1]
mid = (L + R) / 2
side = (L - R) / 2
# karaoke-style: vocal is centred, so mid carries it; subtracting a scaled side
# removes what is panned wide. 1.0 is the standard setting.
v = mid - 1.0 * side
v = mid - 0.0 * side if 'raw' in sys.argv else v

# band-limit to the vocal formant region
win = 1024; hop = 110
nfr = 1 + (len(v) - win) // hop
window = np.hanning(win)
freqs = np.fft.rfftfreq(win, 1.0 / sr)
band = (freqs >= 350) & (freqs <= 3200)

E = np.empty(nfr)
for i in range(nfr):
    S = np.abs(np.fft.rfft(v[i*hop: i*hop+win] * window))
    E[i] = S[band].sum()
E = E / (E.max() + 1e-9)

# envelope follower: fast attack, slower release
env = np.empty(nfr)
a = 0.0
for i in range(nfr):
    a = max(E[i], a * 0.86)
    env[i] = a
env = env / (env.max() + 1e-9)

per = 0.025
step = max(1, int(per * sr / hop))
chars = ' .:-=+*#@'
rows = []; labels = []
for j in range(0, nfr, step):
    e = env[j:j+step].max()
    rows.append(chars[min(8, int(e * 9))])
    labels.append(t0 + j * hop / sr)

BLK = 100
print(f'\n=== vocal-isolated envelope {t0}..{t1}, 1 char = {per*1000:.0f}ms ===')
for s in range(0, len(rows), BLK):
    seg = rows[s:s+BLK]; ts = labels[s:s+BLK]
    print('  ' + ''.join(seg))
    r = ''
    for t in ts:
        f = t - int(t)
        r += '|' if f < per or f > 1 - per else ('+' if abs(f - .5) < per else ' ')
    print('  ' + r)
    print('   t=' + f'{ts[0]:.2f}' + ' ' * max(0, BLK - 16) + f'{ts[-1]:.2f}')
    print()

peaks = []
for i in range(3, nfr - 3):
    if env[i] > 0.30 and env[i] >= env[i-1] and env[i] >= env[i+1] and env[i] > env[i-2] and env[i] > env[i+2]:
        t = t0 + i * hop / sr
        if not peaks or t - peaks[-1][0] > 0.15:
            peaks.append((t, env[i]))
print(f'{len(peaks)} syllable cores (env > 0.30):')
for t, val in peaks:
    print(f'  {t:8.3f}   {val:.3f}  {"#"*int(val*40)}')

"""Vocal energy AT EACH BEAT of the love section.

The fill times in the score are lyric-sheet line starts, and the measured beat
grid (130.83 BPM, anchor 175.017) shows they land BETWEEN beats — which is what
"卡的点不是很舒服" describes. So score the beats and pick from them.

Prints each beat time, its vocal-band energy, and whether it is a downbeat.
"""
import sys, wave
import numpy as np

path = r'_pv\st.wav'
t0, t1 = 178.0, 193.0
BPM = 130.83
ANCHOR = 175.017

w = wave.open(path, 'rb')
sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels()
# read the WHOLE file and slice in numpy. `setpos` + readframes with a stereo
# frame count was returning the wrong region (every energy came out exactly
# 0.000, which is the tell: not a quiet passage, a misaligned read).
w.rewind()
allraw = w.readframes(n)
w.close()
x = np.frombuffer(allraw, dtype='<i2').astype(np.float64) / 32768.0
x = x.reshape(-1, 2)
mid = (x[:, 0] + x[:, 1]) / 2
side = (x[:, 0] - x[:, 1]) / 2
v = mid - 0.6 * side                      # centre-weighted: the vocal sits mid
print(f'loaded {len(v)/sr:.2f}s of audio')

period = 60.0 / BPM

def vocal_energy(tc, half=0.10):
    a = int((tc - half) * sr); b = int((tc + half) * sr)
    if a < 0 or b > len(v) or b - a < 64: return 0.0
    seg = v[a:b]
    win = np.hanning(len(seg))
    S = np.abs(np.fft.rfft(seg * win))
    fr = np.fft.rfftfreq(len(seg), 1.0 / sr)
    band = (fr >= 350) & (fr <= 3200)
    return float(S[band].sum())

def full_energy(tc, half=0.10):
    a = int((tc - half) * sr); b = int((tc + half) * sr)
    if a < 0 or b > len(v) or b - a < 64: return 0.0
    seg = v[a:b]
    return float(np.sqrt((seg ** 2).mean()))

# beat index k such that beat time = ANCHOR + k*period
k0 = int(np.ceil((t0 - ANCHOR) / period))
k1 = int(np.floor((t1 - ANCHOR) / period))

rows = []
for k in range(k0, k1 + 1):
    t = ANCHOR + k * period
    ve = vocal_energy(t)
    fe = full_energy(t)
    rows.append((k, t, ve, fe))

vmax = max(r[2] for r in rows) or 1.0
fmax = max(r[3] for r in rows) or 1.0

print(f'beat period {period:.4f}s  ({BPM:.2f} BPM)   anchor {ANCHOR}')
print(f'{"k":>4} {"time":>9} {"vocal":>7} {"rms":>7}   vocal energy')
for k, t, ve, fe in rows:
    down = ' [1]' if k % 4 == 0 else '    '
    bar = '#' * int(ve / vmax * 46)
    print(f'{k:>4} {t:9.3f} {ve/vmax:7.3f} {fe/fmax:7.3f}{down} {bar}')

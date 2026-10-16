"""Find the real syllable onsets in the love section (175-195s).

The heart fills on "LO-O-OVE" syllables, and the user says the landing points
feel wrong. Guessing at them from the lyric sheet is what produced that: the
sheet gives the START of each line, not where each syllable is actually SUNG.
So measure the audio.

Method: band-limited energy (the vocal sits well above the bass), spectral flux
for onset detection, then peak-pick. Output is a list of onset times in seconds.
"""
import sys, wave, struct
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else r'_pv\pv.wav'
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 175.0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 196.0

w = wave.open(path, 'rb')
sr = w.getframerate()
n = w.getnframes()
ch = w.getnchannels()
sw = w.getsampwidth()
print(f'file: {path}  {sr}Hz  {ch}ch  {sw*8}bit  {n/sr:.2f}s')

a = int(t0 * sr); b = min(n, int(t1 * sr))
w.setpos(a)
raw = w.readframes(b - a)
w.close()

if sw == 2:
    x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
else:
    x = np.frombuffer(raw, dtype='<i4').astype(np.float64) / 2147483648.0
if ch == 2:
    x = x.reshape(-1, 2).mean(axis=1)

print(f'analysing {t0}..{t1}  ({len(x)} samples)')

# --- onset detection ------------------------------------------------------
# STFT
win = 1024
hop = 256
nfr = 1 + (len(x) - win) // hop
window = np.hanning(win)
S = np.empty((nfr, win // 2 + 1))
for i in range(nfr):
    seg = x[i * hop: i * hop + win] * window
    S[i] = np.abs(np.fft.rfft(seg))
freqs = np.fft.rfftfreq(win, 1.0 / sr)

# keep the vocal band: 200 Hz .. 4 kHz. Below is bass/drums, above is hiss.
band = (freqs >= 200) & (freqs <= 4000)
E = S[:, band]

# log-compress, then half-wave-rectified spectral flux
L = np.log1p(E * 100)
flux = np.zeros(nfr)
d = np.diff(L, axis=0)
flux[1:] = np.maximum(d, 0).sum(axis=1)

# normalise and smooth very lightly
flux = flux / (flux.max() + 1e-9)
k = np.array([.15, .7, .15])
flux = np.convolve(flux, k, mode='same')

# adaptive threshold: local mean over ~0.4s
wlen = max(3, int(0.40 * sr / hop))
pad = np.pad(flux, wlen // 2, mode='edge')
thr = np.array([pad[i:i + wlen].mean() for i in range(nfr)]) * 1.45 + 0.02

# peak pick
onsets = []
last = -1e9
for i in range(1, nfr - 1):
    if flux[i] > thr[i] and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1]:
        t = t0 + i * hop / sr
        if t - last >= 0.16:                 # minimum gap: syllables are ~0.2s
            onsets.append((t, flux[i]))
            last = t

print(f'\n{len(onsets)} onsets between {t0} and {t1}:\n')
for t, v in onsets:
    print(f'  {t:8.3f}   strength {v:.3f}')

# also print the strongest ones, since the LO-O-OVE hits should be loud
print('\nstrongest 20:')
for t, v in sorted(onsets, key=lambda z: -z[1])[:20]:
    print(f'  {t:8.3f}   {v:.3f}')

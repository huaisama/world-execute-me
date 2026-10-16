"""Find when "A-M" and "P-M" are actually sung in the identity-swap section.

The dial's hand position is currently a pure function of song time
(`clock * .11`), so wherever the hand happens to be when the syllables land is
an accident. To make the two accents HIT, they have to be measured — the same
approach used for the love section's fill beats, where a grid guess was up to
0.6s early.

Writes nothing outside stdout.
"""
import subprocess, sys, numpy as np, os

FFMPEG = r"C:\ffmpeg\bin\ffmpeg.exe"
SRC = os.path.join("audio", "world-execute-me.mp3")
T0, T1 = 92.0, 97.0
SR = 22050

# decode the whole file once, then slice (seeking with -ss on a compressed
# source lands on the wrong frame and shifts every measurement)
raw = subprocess.run(
    [FFMPEG, "-v", "error", "-i", SRC, "-f", "s16le", "-ac", "1",
     "-ar", str(SR), "-"],
    capture_output=True).stdout
x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
print(f"decoded {len(x)/SR:.3f}s of audio")

a, b = int(T0 * SR), int(T1 * SR)
seg = x[a:b]

# energy envelope in ~11ms frames
HOP = int(SR * 0.011)
n = len(seg) // HOP
env = np.array([np.sqrt(np.mean(seg[i*HOP:(i+1)*HOP] ** 2)) for i in range(n)])
t = T0 + np.arange(n) * HOP / SR

# onset strength = positive change in the envelope
d = np.diff(env, prepend=env[0])
d[d < 0] = 0

# peaks: local maxima that stand out from their neighbourhood
thr = d.mean() + 0.9 * d.std()
peaks = []
for i in range(1, n - 1):
    if d[i] >= thr and d[i] >= d[i-1] and d[i] >= d[i+1]:
        peaks.append((t[i], d[i], env[i]))
peaks.sort(key=lambda p: -p[1])

print(f"\nstrongest onsets in {T0}-{T1}s  (threshold {thr:.4f})")
for tt, st, en in peaks[:14]:
    print(f"  t={tt:7.3f}   onset={st:.4f}   level={en:.4f}")

# The lyric line starts at 93.52 and the next at 95.28, so the sung phrase
# lives inside that window. Report the envelope maxima in it, which is where
# the vowels (A, M, P, M) actually sit.
print("\nphrase window 93.52 - 95.28 :")
w = (t >= 93.52) & (t <= 95.28)
tw, ew = t[w], env[w]
# local maxima above the window mean
m = ew.mean()
cand = [(tw[i], ew[i]) for i in range(1, len(ew)-1)
        if ew[i] > m and ew[i] >= ew[i-1] and ew[i] >= ew[i+1]]
cand.sort(key=lambda p: -p[1])
for tt, en in cand[:10]:
    print(f"  t={tt:7.3f}   level={en:.4f}")

np.save(os.path.join("_pv", "_ampm_env.npy"), np.vstack([t, env]))
print("\nsaved _pv/_ampm_env.npy for inspection")

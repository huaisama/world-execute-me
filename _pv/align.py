import numpy as np, sys, wave

def load(p):
    with wave.open(p, 'rb') as w:
        sr = w.getframerate()
        n = w.getnframes()
        ch = w.getnchannels()
        d = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32)
    if ch > 1:
        d = d.reshape(-1, ch).mean(axis=1)
    return d, sr

a, sr = load(sys.argv[1])   # pv
b, sr2 = load(sys.argv[2])  # mp3
assert sr == sr2, (sr, sr2)
print('pv samples', len(a), len(a)/sr, 'mp3', len(b), len(b)/sr)

# normalise
a = a - a.mean(); b = b - b.mean()
n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
fa = np.fft.rfft(a, n); fb = np.fft.rfft(b, n)
cc = np.fft.irfft(fa * np.conj(fb), n)
cc = np.concatenate((cc[-(len(b)-1):], cc[:len(a)]))
lags = np.arange(-(len(b)-1), len(a))
k = int(np.argmax(cc))
print('best lag samples', lags[k], 'seconds', lags[k]/sr)
# top 5 peaks
idx = np.argsort(cc)[::-1][:5]
for i in idx:
    print('  lag %.3fs  score %.1f' % (lags[i]/sr, cc[i]))

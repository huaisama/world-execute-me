"""Print the fine energy envelope of "From AM to PM" so the syllable structure
is visible, instead of guessing which peak is which letter."""
import numpy as np, os

d = np.load(os.path.join("_pv", "_ampm_env.npy"))
t, env = d[0], d[1]
w = (t >= 93.30) & (t <= 95.70)
t, env = t[w], env[w]

# normalise for display
e = env / env.max()
print('"From AM to PM"  —  energy envelope, 40ms per column\n')
print("        " + "".join(str(int(x) % 10) for x in np.arange(93.3, 95.7, 0.08))[:30])
for lo in np.arange(0, 1.0, 0.05):
    row = ""
    for i in range(0, len(t), 7):
        v = e[i:i+7].max()
        row += "#" if v >= lo + 0.05 else ("." if v >= lo else " ")
    print(f"  {lo:.2f}  {row}")

# the strongest local maxima, which is where the vowels sit
print("\nlocal maxima above 25% of the phrase peak:")
for i in range(2, len(e) - 2):
    if e[i] > 0.25 and e[i] >= e[i-1] and e[i] >= e[i+1] and e[i] >= e[i-2] and e[i] >= e[i+2]:
        print(f"   t = {t[i]:7.3f}   {e[i]:.3f}   {'*' * int(e[i] * 40)}")

print("\ntime axis (seconds) at every 10th column:")
for i in range(0, len(t), 70):
    print(f"   {t[i]:.2f}")

"""Critic aid for a restyled panorama.
usage: python3 -I panocheck.py <pano3d.png> <restyled.(png|jpg)> <out_prefix>
- resizes the restyled pano to the 3D template size (writes <out_prefix>-fit.jpg, the file to ship)
- <out_prefix>-edges.jpg : 3D model edges in red over the photo (geometry drift shows as red lines off the photo's edges)
- <out_prefix>-seam.jpg  : right edge strip | left edge strip, side by side (the 360 wrap must look continuous)
- prints per-tile drift (dx, dy in template px) from edge cross-correlation, on a 8 x 3 grid
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

a_path, b_path, out = sys.argv[1:4]
A = Image.open(a_path).convert('RGB')
W, H = A.size
B = Image.open(b_path).convert('RGB').resize((W, H), Image.LANCZOS)
B.save(out + '-fit.jpg', quality=90, optimize=True, progressive=True)

def edges(im):
    e = np.asarray(im.convert('L').filter(ImageFilter.FIND_EDGES), dtype=float)
    return e / (e.max() + 1e-6)

ea, eb = edges(A), edges(B)
ov = np.asarray(B, dtype=float) * 0.75
mask = ea > 0.12
ov[mask] = [255, 40, 40]
Image.fromarray(ov.astype('uint8')).resize((W // 2, H // 2)).save(out + '-edges.jpg', quality=88)

s = 220
seam = Image.new('RGB', (2 * s, H))
seam.paste(B.crop((W - s, 0, W, H)), (0, 0))
seam.paste(B.crop((0, 0, s, H)), (s, 0))
seam.resize((s, H // 2)).save(out + '-seam.jpg', quality=88)

def shift(a, b, R=24, step=2):
    best = (0, 0, -1)
    h, w = a.shape
    for dy in range(-R, R + 1, step):
        for dx in range(-R, R + 1, step):
            A_ = a[max(0, dy):h + min(0, dy), max(0, dx):w + min(0, dx)]
            B_ = b[max(0, -dy):h + min(0, -dy), max(0, -dx):w + min(0, -dx)]
            c = (A_ * B_).mean()
            if c > best[2]:
                best = (dx, dy, c)
    return best

# downsample 2x for speed; report in template px
sa = np.asarray(Image.fromarray((ea * 255).astype('uint8')).resize((W // 2, H // 2)), dtype=float)
sb = np.asarray(Image.fromarray((eb * 255).astype('uint8')).resize((W // 2, H // 2)), dtype=float)
gx, gy = 8, 3
tw, th = (W // 2) // gx, (H // 2) // gy
print('tile drift (dx,dy) in template px; "." = too little structure')
for j in range(gy):
    row = []
    for i in range(gx):
        ta = sa[j * th:(j + 1) * th, i * tw:(i + 1) * tw]
        tb = sb[j * th:(j + 1) * th, i * tw:(i + 1) * tw]
        if ta.mean() < 3:
            row.append('   .    ')
            continue
        dx, dy, _ = shift(ta, tb)
        row.append(f'{2*dx:+4d},{2*dy:+3d}')
    print(' '.join(row))

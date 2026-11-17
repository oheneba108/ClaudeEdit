"""Seam repair helpers for 360 panoramas.
roll:    python3 -I panoroll.py roll <in> <out>                      -> image rolled by half its width (seam moves to the centre)
merge:   python3 -I panoroll.py merge <fit.jpg> <repaired_rolled> <out.jpg> [band_frac=0.16]
         takes only a feathered centre band from the repaired (rolled) image, un-rolls it, and keeps every other pixel of fit.jpg
"""
import sys
import numpy as np
from PIL import Image
cmd = sys.argv[1]
if cmd == 'roll':
    im = np.asarray(Image.open(sys.argv[2]).convert('RGB'))
    Image.fromarray(np.roll(im, im.shape[1] // 2, axis=1)).save(sys.argv[3], quality=93)
elif cmd == 'merge':
    fit = np.asarray(Image.open(sys.argv[2]).convert('RGB'), dtype=float)
    H, W, _ = fit.shape
    rep = np.asarray(Image.open(sys.argv[3]).convert('RGB').resize((W, H), Image.LANCZOS), dtype=float)
    band = float(sys.argv[5]) if len(sys.argv) > 5 else 0.16
    x = np.abs(np.arange(W) - W / 2) / W            # 0 at centre
    half, feather = band / 2, band / 4
    w = np.clip((half - x) / feather, 0, 1)[None, :, None]   # 1 in the core, ramps to 0 at the band edge
    rolled = np.roll(fit, W // 2, axis=1)
    out = rolled * (1 - w) + rep * w
    Image.fromarray(np.roll(out, -(W // 2), axis=1).clip(0, 255).astype('uint8')).save(sys.argv[4], quality=90, optimize=True, progressive=True)

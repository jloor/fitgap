#!/usr/bin/env python3
"""Coverage test: does the theme actually reach every surface on the page?

The palette audit (palettes.py) proves the colours are sound. It cannot prove
they are the colours on screen — those are different claims, and the gap
between them is where every real defect in this theme has lived: a credentials
field at 1.76:1 and response panels at #FFFFFF, both while the audit was green.

This closes that gap from the other end. Point it at a screenshot of the live
hub and it classifies every colour covering a meaningful share of the page:

    palette    an exact theme token
    antialias  within 4/channel of a token — text edges, subpixel blending
    blend      a mix of two tokens — overlays, hover states, shadows
    PLATFORM   none of the above: a surface the theme never claimed

Anything in the last bucket is unthemed by definition, and its bounding box
says which component to go and claim.

    python3 design/themes/coverage.py shot.png
    python3 design/themes/coverage.py shot.png --theme carbon --crop 410,60
    python3 design/themes/coverage.py shot.png --max-platform 1.0   # gate CI

Exits non-zero when the platform share exceeds --max-platform, so it can gate
a commit the way the palette audit does.
"""
import argparse, os, sys
from collections import Counter

try:
    from PIL import Image
except ImportError:
    sys.exit("needs Pillow:  pip install --user Pillow")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palettes import resolve_all

def rgb(h): return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
def hx(c):  return '#%02X%02X%02X' % c

def build_palette(theme):
    res, _, _ = resolve_all()
    if theme not in res:
        sys.exit(f"unknown theme {theme!r}; have: {', '.join(res)}")
    pal = {}
    for mode in ('light', 'dark'):
        for k, v in res[theme][mode].items():
            if isinstance(v, str) and v.startswith('#'):
                pal.setdefault(v.upper(), f"{mode}.{k}")
    # the code surface is the dark palette reused in both modes
    pal.setdefault(res[theme]['dark']['bg2'].upper(), 'code.bg')
    return [(rgb(h), n) for h, n in pal.items()]

def classify(c, palr):
    for q, n in palr:
        if c == q: return 'palette', n
    for q, n in palr:
        if all(abs(x - y) <= 4 for x, y in zip(c, q)): return 'antialias', n
    for q1, n1 in palr:
        for q2, n2 in palr:
            if q1 is q2: continue
            for t in (0.2, 0.35, 0.5, 0.65, 0.8):
                b = tuple(round(x * (1 - t) + y * t) for x, y in zip(q1, q2))
                if all(abs(x - y) <= 3 for x, y in zip(c, b)):
                    return 'blend', f"{n1}+{n2}"
    return 'PLATFORM', None

def bbox(px, W, H, colour, stride=2):
    xs, ys = [], []
    for y in range(0, H, stride):
        for x in range(0, W, stride):
            if px[x, y] == colour: xs.append(x); ys.append(y)
    if not xs: return None
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('screenshot')
    ap.add_argument('--theme', default='aurora')
    ap.add_argument('--crop', default='0,0',
                    help='x,y origin to crop from — use it to drop editor panels '
                         'or OS chrome that are not the hub')
    ap.add_argument('--min-share', type=float, default=0.2,
                    help='ignore colours under this %% of the page (default 0.2)')
    ap.add_argument('--max-platform', type=float, default=None,
                    help='exit non-zero if total platform share exceeds this %%')
    a = ap.parse_args()

    palr = build_palette(a.theme)
    im = Image.open(a.screenshot).convert('RGB')
    cx, cy = (int(v) for v in a.crop.split(','))
    if cx or cy: im = im.crop((cx, cy, im.size[0], im.size[1]))
    W, H = im.size
    px = im.load()
    total = W * H
    cnt = Counter(im.getdata())

    print(f"{a.screenshot}")
    print(f"theme {a.theme} · analysing {W}x{H} = {total:,} px"
          f"{f' · cropped from {cx},{cy}' if (cx or cy) else ''}\n")

    rows, platform_share = [], 0.0
    for c, n in cnt.most_common(120):
        share = 100 * n / total
        if share < a.min_share: continue
        kind, tok = classify(c, palr)
        if kind == 'PLATFORM':
            platform_share += share
            rows.append((share, c, kind, tok))
        else:
            rows.append((share, c, kind, tok))

    print(f"{'colour':9} {'share':>7}  {'kind':10} token / location")
    print('-' * 72)
    for share, c, kind, tok in rows:
        if kind == 'PLATFORM':
            b = bbox(px, W, H, c)
            loc = f"x={b[0]+cx} y={b[1]+cy} {b[2]}x{b[3]}" if b else '?'
            print(f"{hx(c):9} {share:6.2f}%  {'PLATFORM':10} {loc}   <-- unthemed")
        else:
            print(f"{hx(c):9} {share:6.2f}%  {kind:10} {tok}")

    themed = sum(s for s, _, k, _ in rows if k != 'PLATFORM')
    print('-' * 72)
    print(f"themed (palette/antialias/blend): {themed:6.2f}%")
    print(f"platform (unthemed)             : {platform_share:6.2f}%")
    print(f"below --min-share threshold     : {100-themed-platform_share:6.2f}%")

    if a.max_platform is not None and platform_share > a.max_platform:
        print(f"\nFAIL: platform share {platform_share:.2f}% exceeds "
              f"--max-platform {a.max_platform:.2f}%")
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())

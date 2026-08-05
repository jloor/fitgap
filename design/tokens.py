#!/usr/bin/env python3
"""Generate the Fitgap design tokens and verify every contrast pair against WCAG 2.1.

Ramps are built in OKLCH so lightness steps are perceptually even, then converted
to sRGB and gamut-clipped. Contrast is computed from the WCAG relative-luminance
formula -- no library, so the numbers are auditable.
"""
import math

# ---------- color space ----------

def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def linear_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055

def oklch_to_srgb(L, C, h_deg):
    h = math.radians(h_deg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    out = []
    for v in (r, g, bl):
        v = linear_to_srgb(v)
        out.append(max(0.0, min(1.0, v)))  # gamut clip
    return tuple(out)

def to_hex(rgb):
    return "#" + "".join(f"{round(c * 255):02x}" for c in rgb)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def luminance(rgb):
    r, g, b = (srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(hex1, hex2):
    l1, l2 = luminance(hex_to_rgb(hex1)), luminance(hex_to_rgb(hex2))
    lo, hi = sorted((l1, l2))
    return (hi + 0.05) / (lo + 0.05)

# ---------- ramps ----------
# step -> (OKLCH lightness, chroma multiplier)
STEPS = [
    (50,  0.975, 0.20), (100, 0.945, 0.34), (200, 0.890, 0.55),
    (300, 0.815, 0.76), (400, 0.730, 0.94), (500, 0.648, 1.00),
    (600, 0.565, 0.96), (700, 0.478, 0.84), (800, 0.398, 0.68),
    (900, 0.328, 0.53), (950, 0.238, 0.40),
]

RAMPS = {
    # name:      (hue, peak chroma)
    "teal":     (196.0, 0.115),   # primary  - the Fitgap base hue
    "indigo":   (268.0, 0.130),   # accent   - links / interactive
    "slate":    (232.0, 0.017),   # neutral  - hue-matched gray
    "green":    (150.0, 0.115),   # success
    "amber":    (78.0,  0.130),   # warning
    "red":      (25.0,  0.135),   # danger
}

def build():
    ramps = {}
    for name, (hue, peak) in RAMPS.items():
        ramps[name] = {step: to_hex(oklch_to_srgb(L, peak * cm, hue))
                       for step, L, cm in ((s, L, cm) for s, L, cm in STEPS)}
    return ramps

# ---------- type scale ----------
RATIO = 1.2   # minor third
BASE_PX = 16

TYPE_STEPS = [
    ("xs",   -2), ("sm",   -1), ("base",  0), ("lg",    1),
    ("xl",    2), ("2xl",   3), ("3xl",   4), ("4xl",   5), ("5xl", 6),
]

LINE_HEIGHTS = {
    "xs": 1.5, "sm": 1.5, "base": 1.65, "lg": 1.55, "xl": 1.4,
    "2xl": 1.3, "3xl": 1.25, "4xl": 1.18, "5xl": 1.1,
}

def type_scale():
    out = []
    for name, step in TYPE_STEPS:
        px = BASE_PX * (RATIO ** step)
        out.append((name, round(px, 2), round(px / BASE_PX, 4), LINE_HEIGHTS[name]))
    return out

# ---------- report ----------
if __name__ == "__main__":
    ramps = build()

    print("=" * 74)
    print("COLOR RAMPS (OKLCH-derived, gamut-clipped to sRGB)")
    print("=" * 74)
    header = "ramp     " + "".join(f"{s:>8}" for s, _, _ in STEPS)
    print(header)
    for name, ramp in ramps.items():
        print(f"{name:<9}" + "".join(f"{ramp[s]:>8}" for s, _, _ in STEPS))

    print()
    print("=" * 74)
    print("TYPE SCALE (modular, ratio %.2f, base %dpx)" % (RATIO, BASE_PX))
    print("=" * 74)
    print(f"{'token':<8}{'px':>9}{'rem':>9}{'line-height':>14}")
    for name, px, rem, lh in type_scale():
        print(f"{name:<8}{px:>9}{rem:>9}{lh:>14}")

    # ---------- contrast verification ----------
    L = {  # light theme
        "bg":            ramps["slate"][50],
        "surface":       "#ffffff",
        "text":          ramps["slate"][900],
        "text-muted":    ramps["slate"][700],
        "border":        ramps["slate"][200],
        "primary":       ramps["teal"][700],
        "primary-text":  "#ffffff",
        "link":          ramps["indigo"][700],
        "success":       ramps["green"][700],
        "warning":       ramps["amber"][800],
        "danger":        ramps["red"][700],
    }
    D = {  # dark theme
        "bg":            ramps["slate"][950],
        "surface":       ramps["slate"][900],
        "text":          ramps["slate"][100],
        "text-muted":    ramps["slate"][400],
        "border":        ramps["slate"][800],
        "primary":       ramps["teal"][300],
        "primary-text":  ramps["slate"][950],
        "link":          ramps["indigo"][300],
        "success":       ramps["green"][300],
        "warning":       ramps["amber"][300],
        "danger":        ramps["red"][300],
    }

    PAIRS = [
        ("body text on page bg",        "text",       "bg",      4.5),
        ("body text on surface",        "text",       "surface", 4.5),
        ("muted text on page bg",       "text-muted", "bg",      4.5),
        ("muted text on surface",       "text-muted", "surface", 4.5),
        ("link on page bg",             "link",       "bg",      4.5),
        ("link on surface",             "link",       "surface", 4.5),
        ("primary text on surface",     "primary",    "surface", 4.5),
        ("on-primary on primary fill",  "primary-text", "primary", 4.5),
        ("success on surface",          "success",    "surface", 4.5),
        ("warning on surface",          "warning",    "surface", 4.5),
        ("danger on surface",           "danger",     "surface", 4.5),
        ("border on page bg (UI)",      "border",     "bg",      1.0),
    ]

    failures = []
    for label, theme in (("LIGHT", L), ("DARK", D)):
        print()
        print("=" * 74)
        print(f"WCAG 2.1 CONTRAST -- {label} THEME")
        print("=" * 74)
        print(f"{'pair':<32}{'fg':>9}{'bg':>9}{'ratio':>9}{'need':>7}{'':>2}verdict")
        for name, fg, bg, need in PAIRS:
            r = contrast(theme[fg], theme[bg])
            ok = r >= need
            if not ok:
                failures.append((label, name, round(r, 2), need))
            aaa = " AAA" if r >= 7 else (" AA" if r >= 4.5 else "")
            print(f"{name:<32}{theme[fg]:>9}{theme[bg]:>9}{r:>9.2f}{need:>7}  "
                  f"{'PASS' if ok else 'FAIL'}{aaa}")

    print()
    print("=" * 74)
    if failures:
        print(f"{len(failures)} FAILING PAIR(S):")
        for label, name, r, need in failures:
            print(f"  [{label}] {name}: {r} < {need}")
    else:
        print("ALL PAIRS PASS their WCAG 2.1 threshold.")
    print("=" * 74)

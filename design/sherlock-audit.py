#!/usr/bin/env python3
"""Verify the Sherlock Holmes theme against WCAG 2.1.

Run:  python3 design/sherlock-audit.py
Exits non-zero if any pair regresses, so it can gate a commit.

Design note -- two tokens were SPLIT rather than flattened:
  * brass: the original #B8860B is 2.76:1 on parchment. Rather than darken it
    into olive and lose the gas-lamp quality, brass stays decorative (rules,
    glows, large display) and --brass-text carries small text.
  * border: same split. WCAG 1.4.11 wants 3:1 only for boundaries that IDENTIFY
    a component. Decorative Strand rules keep the soft tan; functional
    boundaries (inputs, cards, buttons) use --border-ui.
"""
import sys

def s2l(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(h):
    h = h.lstrip("#")
    r, g, b = (s2l(int(h[i:i+2], 16) / 255) for i in (0, 2, 4))
    return 0.2126*r + 0.7152*g + 0.0722*b

def cr(a, b):
    lo, hi = sorted((lum(a), lum(b)))
    return (hi + 0.05) / (lo + 0.05)

LIGHT = {
    "bg-primary": "#F4ECD8", "bg-secondary": "#E8DCC4",
    "bg-tertiary": "#D4C5A0", "bg-inset": "#EDE0C8",
    "text-primary": "#2B1D0E", "text-secondary": "#5C4A30",
    "text-muted": "#654E31",          # repaired from #8B7355
    "on-accent": "#F4ECD8", "on-accent-muted": "#F4ECD8",
    "accent": "#8B0000",
    "accent-hover": "#9E2324",        # repaired from #A52A2A
    "accent-muted": "#A04040",
    "brass": "#B8860B",               # decorative only
    "brass-text": "#764800",          # repaired sibling for text
    "tobacco": "#6B4226",
    "fog": "#455466",                 # repaired from #6B7B8D
    "ink-blue": "#1B2845",
    "border": "#C4B280",              # decorative only
    "border-ui": "#988756",           # repaired sibling for components
    "border-strong": "#8B7355",
    "success": "#3B5B2B",             # repaired from #4A6B3A
    "warning": "#764800",
    "error": "#8B0000", "info": "#1B2845",
}

DARK = {
    "bg-primary": "#1A1510", "bg-secondary": "#221B13",
    "bg-tertiary": "#2E2419", "bg-inset": "#15110C",
    "text-primary": "#E8DCC4", "text-secondary": "#C4B280",
    "text-muted": "#A2896B",          # repaired from #8B7355
    "on-accent": "#1A1510",           # accent is light in dark theme
    "on-accent-muted": "#F4ECD8",     # accent-muted stays a dark fill
    "accent": "#DE6766",              # repaired from #C45050
    "accent-hover": "#EC8483",
    "accent-muted": "#8B3030",        # dark fill; parchment text on top
    "brass": "#DAA520", "brass-text": "#DAA520",
    "tobacco": "#A78665",             # repaired from #8B6B4A
    "fog": "#8B9BAA",
    "ink-blue": "#6E8EBA",            # repaired from #5B7BA5
    "border": "#4A3825",              # decorative only
    "border-ui": "#74614D",           # repaired sibling
    "border-strong": "#785F41",       # repaired from #6B5235
    "success": "#7A9B6A", "warning": "#DAA520",
    "error": "#DE6765", "info": "#6E8EBA",
}

TEXT_BGS = ["bg-primary", "bg-secondary", "bg-tertiary", "bg-inset"]

# tokens that must clear 4.5:1 as small text on every surface
TEXT_TOKENS = ["text-primary", "text-secondary", "text-muted", "accent",
               "accent-hover", "brass-text", "tobacco", "fog", "ink-blue",
               "success", "warning", "error", "info"]

# tokens that must clear 3:1 as a component boundary against the page
UI_TOKENS = ["border-ui", "border-strong"]

# fills that carry inverse text
FILLS = [("on-accent", "accent"), ("on-accent-muted", "accent-muted")]

def audit(name, T):
    print("=" * 70)
    print(f"WCAG 2.1 -- {name}")
    print("=" * 70)
    fails = []
    for tok in TEXT_TOKENS:
        worst_bg, worst = None, 99.0
        for bg in TEXT_BGS:
            r = cr(T[tok], T[bg])
            if r < worst:
                worst, worst_bg = r, bg
        ok = worst >= 4.5
        if not ok:
            fails.append((tok, worst, 4.5))
        print(f"  {tok:<16} worst {worst:>6.2f} on {worst_bg:<14}"
              f"{'pass' if ok else 'FAIL'}{'  AAA' if worst >= 7 else ''}")
    for tok in UI_TOKENS:
        r = cr(T[tok], T["bg-primary"])
        ok = r >= 3.0
        if not ok:
            fails.append((tok, r, 3.0))
        print(f"  {tok:<16}       {r:>6.2f} on bg-primary   "
              f"{'pass' if ok else 'FAIL'}")
    for fg, bg in FILLS:
        r = cr(T[fg], T[bg])
        ok = r >= 4.5
        if not ok:
            fails.append((f"{fg} on {bg}", r, 4.5))
        print(f"  {fg + ' on ' + bg:<16} {r:>6.2f}              "
              f"{'pass' if ok else 'FAIL'}")
    print()
    return fails

all_fails = audit("LIGHT -- 'The Sitting Room'", LIGHT)
all_fails += audit("DARK -- 'The Foggy Streets'", DARK)

print("=" * 70)
if all_fails:
    print(f"{len(all_fails)} FAILING PAIR(S):")
    for tok, r, need in all_fails:
        print(f"  {tok}: {r:.2f} < {need}")
    sys.exit(1)
print("ALL PAIRS PASS. Decorative-only tokens (brass, border, accent-muted)")
print("are excluded by design -- they must never carry small text.")
print("=" * 70)

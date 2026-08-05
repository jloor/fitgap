#!/usr/bin/env python3
"""Five palettes, each light + dark, repaired to WCAG 2.1 AA before emission.

Repair method (same as the Sherlock theme): hold hue and saturation, move
lightness only. A colour that has to change to pass should still be the colour
it was meant to be.

Import this; build.py turns it into stylesheets. Run it directly for a report.
"""
import colorsys, sys

# --------------------------------------------------------------------- colour
def s2l(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(h):
    h = h.lstrip('#')
    r, g, b = (s2l(int(h[i:i+2], 16) / 255) for i in (0, 2, 4))
    return 0.2126*r + 0.7152*g + 0.0722*b
def cr(a, b):
    lo, hi = sorted((lum(a), lum(b)))
    return (hi + 0.05) / (lo + 0.05)
def to_hls(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16)/255 for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r, g, b)
def from_hls(hh, ll, ss):
    r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
    return '#%02X%02X%02X' % (round(r*255), round(g*255), round(b*255))

def repair(colour, bgs, target, darken):
    """Move lightness only until `colour` clears `target` against every bg."""
    hh, ll, ss = to_hls(colour)
    if all(cr(colour, b) >= target for b in bgs):
        return colour, False
    step = -0.002 if darken else 0.002
    for _ in range(500):
        ll = min(1.0, max(0.0, ll + step))
        cand = from_hls(hh, ll, ss)
        if all(cr(cand, b) >= target for b in bgs):
            return cand, True
    return colour, True   # exhausted; audit will flag it

# ------------------------------------------------------------------- palettes
# bg/text/accent are authored; everything else is derived and repaired.
THEMES = {
 'blueprint': {
   'label': 'Blueprint — drafting table, cyan on navy',
   'light': dict(bg='#F2F6FA', bg2='#E4EDF6', bg3='#D3E2F0', inset='#EAF2F9',
                 text='#0B1B2B', text2='#274156', muted='#3D5A72',
                 accent='#0057B8', accent2='#00417F', border='#B9CFE3',
                 ok='#0F6B45', warn='#8A5200', err='#B3261E', info='#0057B8'),
   'dark':  dict(bg='#0A1420', bg2='#101E2E', bg3='#17293C', inset='#060E17',
                 text='#DCE9F5', text2='#A9C4DC', muted='#7FA3C0',
                 accent='#4DA3FF', accent2='#8CC5FF', border='#274056',
                 ok='#4CC38A', warn='#E0A62E', err='#FF6B6B', info='#4DA3FF'),
 },
 'carbon': {
   'label': 'Carbon — neutral greyscale, one electric accent',
   'light': dict(bg='#FFFFFF', bg2='#F4F5F7', bg3='#E8EAED', inset='#FAFAFB',
                 text='#101317', text2='#3A4048', muted='#565D66',
                 accent='#0F62FE', accent2='#0043CE', border='#C7CBD1',
                 ok='#0E6027', warn='#8A5300', err='#C21E2B', info='#0F62FE'),
   'dark':  dict(bg='#0B0D10', bg2='#14181D', bg3='#1E242B', inset='#07090B',
                 text='#E8EBEF', text2='#B3BAC3', muted='#8B939D',
                 accent='#6EA8FF', accent2='#A6C8FF', border='#2B333C',
                 ok='#42BE65', warn='#F1C21B', err='#FF8389', info='#6EA8FF'),
 },
 'aurora': {
   'label': 'Aurora — violet on deep space',
   'light': dict(bg='#FAF7FF', bg2='#F1EAFB', bg3='#E4D8F6', inset='#F6F1FD',
                 text='#17102A', text2='#3C2C5E', muted='#553F80',
                 accent='#6A2CD9', accent2='#4B1BA5', border='#D0C0EC',
                 ok='#0F6B45', warn='#8A5200', err='#B3261E', info='#6A2CD9'),
   'dark':  dict(bg='#120C1F', bg2='#1B1230', bg3='#261942', inset='#0C0716',
                 text='#EDE6FA', text2='#C4B2E8', muted='#A48FD4',
                 accent='#B18CFF', accent2='#CDB4FF', border='#33244F',
                 ok='#5BD1A0', warn='#E8B93C', err='#FF7A8A', info='#B18CFF'),
 },
 'signal': {
   'label': 'Signal — amber warning-light on graphite',
   'light': dict(bg='#FFFDF7', bg2='#F7F1E4', bg3='#EDE3CE', inset='#FBF8F0',
                 text='#17130A', text2='#42361E', muted='#5C4B2A',
                 accent='#B45309', accent2='#8A3E06', border='#D9CBAE',
                 ok='#14632F', warn='#8A5200', err='#B3261E', info='#0F5F8A'),
   'dark':  dict(bg='#0D0B07', bg2='#16130C', bg3='#221C11', inset='#080604',
                 text='#F5EEDF', text2='#D6C7A6', muted='#B3A183',
                 accent='#FFB020', accent2='#FFC957', border='#33291A',
                 ok='#54C07A', warn='#FFB020', err='#FF7A6B', info='#5CB3E8'),
 },
 'vapor': {
   'label': 'Vapor — teal minimal, near-monochrome',
   'light': dict(bg='#F5FBFB', bg2='#E6F4F2', bg3='#D2EAE6', inset='#F0F9F8',
                 text='#06201F', text2='#1E4644', muted='#2F5F5C',
                 accent='#007A73', accent2='#00564F', border='#B4D8D3',
                 ok='#0F6B45', warn='#8A5200', err='#B3261E', info='#00707F'),
   'dark':  dict(bg='#06120F', bg2='#0C1D19', bg3='#132B25', inset='#040C0A',
                 text='#DFF5F1', text2='#A9D8D0', muted='#84B9B1',
                 accent='#35E0C8', accent2='#7CF0DE', border='#1D3C35',
                 ok='#4CD68A', warn='#E8C04A', err='#FF7E85', info='#35E0C8'),
 },
}

TEXT_KEYS = ['text', 'text2', 'muted', 'accent', 'accent2', 'ok', 'warn', 'err', 'info']

def resolve(mode_palette, is_dark):
    """Return a repaired token dict plus a list of what moved."""
    p = dict(mode_palette)
    bgs = [p['bg'], p['bg2'], p['bg3'], p['inset']]
    moved = []
    for k in TEXT_KEYS:
        fixed, changed = repair(p[k], bgs, 4.5, darken=not is_dark)
        if changed: moved.append((k, p[k], fixed, cr(p[k], min(bgs, key=lambda b: cr(p[k], b))), cr(fixed, min(bgs, key=lambda b: cr(fixed, b)))))
        p[k] = fixed
    # borders identify components: 3:1 against the page only
    fixed, changed = repair(p['border'], [p['bg']], 3.0, darken=not is_dark)
    if changed: moved.append(('border-ui', p['border'], fixed, cr(p['border'], p['bg']), cr(fixed, p['bg'])))
    p['border_ui'] = fixed
    # the authored border stays as the decorative hairline
    p['on_accent'] = p['bg'] if cr(p['bg'], p['accent']) >= 4.5 else (
        '#FFFFFF' if cr('#FFFFFF', p['accent']) >= 4.5 else '#000000')
    return p, moved

def audit(name, p, is_dark, verbose=True):
    bgs = [p['bg'], p['bg2'], p['bg3'], p['inset']]
    fails = []
    if verbose:
        print(f"  {'token':10} {'hex':9} worst   vs")
    for k in TEXT_KEYS:
        worst_bg = min(bgs, key=lambda b: cr(p[k], b))
        r = cr(p[k], worst_bg)
        if r < 4.5: fails.append((name, k, r, 4.5))
        if verbose:
            print(f"  {k:10} {p[k]:9} {r:5.2f}  {worst_bg}  {'AAA' if r>=7 else 'AA ' if r>=4.5 else 'FAIL'}")
    r = cr(p['border_ui'], p['bg'])
    if r < 3.0: fails.append((name, 'border-ui', r, 3.0))
    if verbose: print(f"  {'border-ui':10} {p['border_ui']:9} {r:5.2f}  {p['bg']}  {'AA ' if r>=3 else 'FAIL'}")
    r = cr(p['on_accent'], p['accent'])
    if r < 4.5: fails.append((name, 'on-accent', r, 4.5))
    if verbose: print(f"  {'on-accent':10} {p['on_accent']:9} {r:5.2f}  {p['accent']}  {'AA ' if r>=4.5 else 'FAIL'}")
    return fails

def resolve_all():
    out, allfails, allmoved = {}, [], {}
    for name, t in THEMES.items():
        out[name] = {'label': t['label']}
        for mode in ('light', 'dark'):
            p, moved = resolve(t[mode], mode == 'dark')
            out[name][mode] = p
            allmoved[(name, mode)] = moved
            allfails += audit(name + '/' + mode, p, mode == 'dark', verbose=False)
    return out, allfails, allmoved

if __name__ == '__main__':
    res, fails, moved = resolve_all()
    for name in THEMES:
        print('=' * 66); print(f"{name.upper()} — {THEMES[name]['label']}"); print('=' * 66)
        for mode in ('light', 'dark'):
            print(f"-- {mode} --")
            audit(name, res[name][mode], mode == 'dark')
            m = moved[(name, mode)]
            if m:
                print(f"   repaired {len(m)}:")
                for k, was, now, r0, r1 in m:
                    print(f"     {k:10} {was} -> {now}   {r0:.2f} -> {r1:.2f}")
            print()
    print('=' * 66)
    if fails:
        print(f"{len(fails)} FAILING PAIR(S):")
        for n, k, r, need in fails: print(f"  {n} {k}: {r:.2f} < {need}")
        sys.exit(1)
    print("ALL 10 PALETTES PASS WCAG 2.1 AA.")

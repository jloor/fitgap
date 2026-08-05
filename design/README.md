# The Sherlock Holmes theme — design rationale

A custom theme for the Fitgap documentation hub, built on ReadMe.
221B Baker Street, 1895: gas-lamp glow, Strand Magazine rules, case files on a writing desk.

This document exists because the interesting part of a theme is not how it looks.
It is what the author decided, and why.

---

## The headline: the palette failed accessibility, and the theme catches it

The starting palette — warm ambers, sealing-wax red, brass, London fog — was
beautiful and **failed WCAG 2.1 AA in 20 of 45 colour pairs**.

The worst offenders were not subtle:

| Pair | Ratio | Required |
|---|---|---|
| `brass-light` on parchment | **1.90:1** | 4.5:1 |
| `border` against page (dark) | **1.63:1** | 3.0:1 |
| `accent-muted` on page (dark) | **2.21:1** | 4.5:1 |
| `warning` on parchment | **2.76:1** | 4.5:1 |
| `accent` — *the link colour* — on page (dark) | **3.98:1** | 4.5:1 |

Links were unreadable in dark mode. The warning colour sat at 2.76:1 — and in an
API reference, warnings mark the destructive calls.

### How they were repaired

Every failure was fixed by converting to OKLCH and moving **only lightness**,
holding hue and chroma fixed. That constraint is the point: brass is still brass,
sealing wax is still sealing wax. Nothing turned muddy, because nothing moved
except the one dimension that contrast depends on.

```
text-muted (light)     #8B7355 → #654E31     2.63 → 4.57
warning    (light)     #B8860B → #764800     2.40 → 4.56
accent     (dark)      #C45050 → #DE6766     3.33 → 4.51
border-strong (dark)   #6B5235 → #785F41     2.49 → 3.03
```

### Where the mechanical fix was rejected

Brass at 4.5:1 on parchment resolves to `#875800` — dark olive. It passes, and it
destroys the gas-lamp quality that motivated the colour.

So brass was **split** instead of flattened:

- `--color-brass` (`#B8860B`) stays brass, for rules, glows, and display type
- `--color-brass-text` (`#764800`) carries small text

Borders got the same treatment, on firmer ground: WCAG 1.4.11 requires 3:1 only
for boundaries that *identify* a component. A decorative Strand rule is not a
component boundary. So decorative rules keep the soft tan; inputs, cards, and
buttons use `--color-border-ui`.

Three tokens are marked decorative-only and must never carry small text:
`--color-brass`, `--color-border`, `--color-accent-muted`.

### It is enforced, not asserted

```bash
python3 design/sherlock-audit.py     # exits non-zero on any regression
```

The script computes WCAG relative luminance from first principles — no colour
library — so the arithmetic is auditable. It checks every text token against
**all four** surfaces, not just the primary background, because the manila-folder
tone is the hardest and the easiest to forget. It is wired to gate a commit.

### Where the audit stops — and what got through

It gates the **palette**, not the palette's **coverage**. It proves every colour
pair in the token set is sound. It cannot prove those tokens are the colours
actually on screen, and that distinction is not academic — two real defects lived
in the gap, both on a green audit:

- The **Bearer token placeholder** in the API Reference measured **1.76:1**. Its
  colour never came from the palette; it was ReadMe's `#B8C0C6` default showing
  through on a surface no rule targeted.
- The **Recent Requests and Response panels** rendered `#FFFFFF` against `#F4ECD8`
  parchment. Every one of those surfaces passed its own text-contrast check in
  isolation. The defect was *between* surfaces, and a checker that only ever
  compares text to its own background is structurally blind to it.

Both were found by sampling pixels from a screenshot of the live hub, not by
reading CSS or re-running the audit — the audit was green throughout and stayed
green after the fixes, because the fixes added no new colours. Sections 11 and 12
close these two instances.

The general problem is open. Nothing here tests that a documented `.rm-` class
still governs the surface you think it does, and a theme built on a vendor's
class list is exposed to exactly that drift. The honest description of the current
tooling is: **the colours are proven, their application is spot-checked.** A
coverage test would render the hub and sample it, which is a different and larger
piece of machinery than 128 lines of arithmetic.

Worth saying rather than leaving to be discovered: knowing where your own gate
stops is part of the gate.

---

## Platform fidelity

ReadMe's own Custom CSS panel gives two instructions. This theme follows both,
and a third from their docs.

**1. Overrides are declared on `body`, never `:root`.**
ReadMe loads its own `:root` variables *after* yours. A `:root` override loses the
cascade and silently does nothing.

**2. Dark mode keys off `.ThemeContext_dark` *and* `[data-color-mode="dark"]`.**
These are two different claims, not two spellings of one. `.ThemeContext_dark` is
the class observed on `<body>` in the live DOM; `[data-color-mode="dark"]` is what
ReadMe documents under [Color Schemes][colour-schemes]. Keying off either alone is
a bet, and the failure is not graceful: on a hub that renders the other, dark mode
is dead rather than degraded. So every dark rule here carries both — the palette,
the header variables, the paper texture, and the header background. Flipping the
palette but not the header is worse than flipping neither.

`color-scheme: light` / `dark` is declared alongside each palette so the browser
flips the chrome it draws itself — scrollbars, carets, form controls — rather than
leaving light scrollbars over a dark page.

[colour-schemes]: https://docs.readme.com/main/docs/custom-css-and-javascript#color-schemes

**3. Only documented `.rm-` classes are used as selectors.**
ReadMe states that hashed selectors "change constantly and should not be relied
on." There is not one in this file.

### Semantic HTML over private class names

Beyond the documented `.rm-` containers, this theme styles the **document tree** —
`h2`, `table`, `blockquote`, `pre`, `dl` — rather than guessing at class names
like `.rm-Callout-title`.

This is the load-bearing decision in the whole theme. Undocumented class names
are a bet that a vendor's internals will not change. `table` inside `.rm-Guides`
is guaranteed by HTML. Styling the tree instead of the framework's internals is
what makes a theme survive a platform upgrade.

The same logic was applied to every CSS variable in the source spec: each name was
checked against [ReadMe's published list][css-vars] rather than read for
plausibility. The ones that are not on it — `--Header-textColor`,
`--Sidebar-background`, `--Sidebar-textColor`, `--tryit-borderColor`, and
camelCase `--Header-borderColor` where the real name is `--Header-border-color` —
were cut. Unverified variable names fail *silently*: they look applied and do
nothing. Those surfaces are covered with `.rm-` selectors instead.

The invented names sat directly beside real ones — `--tryit-background` and
`--Sidebar-border-color` are both documented — which is exactly why the list had
to be diffed rather than skimmed. A list that is half wrong looks entirely
plausible.

[css-vars]: https://docs.readme.com/main/docs/custom-css-and-javascript#css-variables

---

## Five defects found in the source CSS

The theme was adapted from a generated specification. It did not survive review.

1. **`calc(1rem * var(--font-scale) ** 3)` is invalid CSS.** There is no
   exponentiation operator in `calc()`. Four of nine type sizes would have
   silently dropped.
2. **`border-bottom: var(--border-ornate) solid …`** where `--border-ornate` was
   `4px double`, expanding to `4px double solid` — two style keywords, invalid,
   declaration discarded. That rule *was* the Strand double rule, the theme's
   signature element.
3. **`--Header-borderColor`** — the real variable is `--Header-border-color`.
   Silent no-op.
4. **`:root` overrides** — loses the cascade, as above.
5. **`[data-theme="dark"]`** — not a ReadMe selector under any reading, so half
   the spec's dark mode was dead on arrival. Its companion
   `[data-color-mode="dark"]` *is* documented and was kept, paired with the
   `.ThemeContext_dark` class actually observed on the hub.

Also corrected: `--fs-xs` at `0.64rem` (10.24px) was below a readable floor and
was raised to 12.8px.

---

## Deliberate omissions

- **No custom JavaScript.** Everything here — double rules, the CONFIDENTIAL
  stamp, wax seal, telegram block, aged-paper texture, gas-lamp glow — is CSS
  borders, pseudo-elements, gradients, and one inline SVG. Custom JS on ReadMe is
  Enterprise-tier; a theme that depends on it breaks when a plan changes. CSS
  survives.
- **No `!important` beyond ReadMe's own high-specificity surfaces.** Used where
  the platform's stylesheet genuinely outranks the theme, nowhere else.
- **Motion respects `prefers-reduced-motion`.** The gas-lamp flicker animates
  opacity only — compositor-only, no layout thrash — and is disabled entirely
  for anyone who has asked for reduced motion.
- **`prefers-contrast: more` drops the paper texture.** It is atmosphere, not
  information.
- **A print stylesheet exists**, because API docs get printed. Texture and
  animation are stripped, link targets are surfaced via `a::after { content:
  attr(href) }`, and `break-inside: avoid` keeps case files and code blocks
  whole across a page break.

---

## Files

| File | Purpose |
|---|---|
| `sherlock-readme.css` | The theme. Paste into Appearance → Custom CSS & JavaScript → CSS. |
| `sherlock-audit.py` | WCAG verification. Exits non-zero on regression. |
| `sherlock-preview.html` | Local preview. Loads the real stylesheet, toggles the real `.ThemeContext_dark` class. |
| `sherlock-readme-html.html` | Font-loading fallback for the HTML tab. Conditional — only if `@import` is stripped. |
| `tokens.css`, `tokens.py` | The earlier teal system, retained as an alternative. |

Typography is Besley (headings, after Robert Besley's 1845 Clarendon), Source
Serif 4 (body), IM Fell English (UI), and Courier Prime (code) — all via Google
Fonts. Sidney Paget's Strand illustrations (1891–1904) are public domain; Paget
died in 1908.

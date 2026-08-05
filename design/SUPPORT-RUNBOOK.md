# Custom CSS on ReadMe — a support runbook

Failure modes of heavily-customized ReadMe hubs, with diagnosis and fix.

Every entry below was hit, reproduced, or verified while building the Sherlock
theme in this directory. None are hypothetical.

**Why this document exists.** Enterprise customers maximize customization — that
is what enterprise tiers are *for*. The support burden that follows is
predictable, and most of it is silent: CSS does not throw. An invalid declaration
is discarded without warning, an unresolved variable falls back to nothing, and
the customer's report is "the theme doesn't work," which is not a diagnosis.

Sorted by how often the failure is *silent*, because silent failures generate the
longest tickets.

---

## The two-minute triage

Before anything else, establish which of three states you are in. This
disambiguates roughly 80% of "my CSS doesn't work" reports.

1. **Is the rule reaching the browser?**
   DevTools → Elements → select the node → Styles pane. If the rule is not listed
   at all, it was never parsed — invalid syntax, or stripped on save. Jump to §5.
2. **Is the rule present but struck through?**
   It parsed and lost the cascade. Jump to §1 or §10.
3. **Is the rule applied but the value is empty or wrong?**
   A custom property did not resolve. Jump to §3.

> The single most useful check: in the Styles pane, hover a `var(--x)` reference.
> If the computed value shows blank, the variable does not exist under that name.
> This distinguishes "wrong name" from "wrong cascade" instantly, and those two
> have completely different fixes.

---

## 1. Variables declared on `:root` do nothing

**Symptom** — "I set all my colours and nothing changed."

**Cause** — ReadMe loads its own `:root` variables *after* the customer's custom
CSS. Same specificity, later declaration wins. The customer's block is present in
DevTools and struck through.

**Fix** — declare on `body` instead. Higher specificity, wins regardless of order.

```css
/* wrong */  :root { --color-primary: #8B0000; }
/* right */  body  { --color-primary: #8B0000; }
```

**Note** — this is documented by ReadMe, and is still the most common report,
because every CSS tutorial on the internet teaches `:root`.

---

## 2. Dark mode ignores the theme entirely

**Symptom** — "Light mode is perfect, dark mode is stock ReadMe."

**Cause** — one of three, and they are not equally wrong. Establish which before
suggesting anything:

- `[data-theme="dark"]` — not a ReadMe selector under any reading. Never matches.
- `@media (prefers-color-scheme: dark)` *unpaired* — matches the OS preference
  rather than ReadMe's control, so it desynchronizes the moment a reader uses the
  in-page switch. Our docs pair it with `[data-color-mode="system"]` for exactly
  that reason; alone, it is a bug.
- `[data-color-mode="dark"]` alone — **documented and correct on paper.** But on a
  hub where the theme is carried by `.ThemeContext_dark` on `<body>`, it leaves
  dark mode stock. This is the one that makes a customer feel gaslit: they
  followed our documentation and it did not work. Do not tell them their selector
  is wrong. It isn't.

**Fix** — write both hooks and stop guessing which a given hub uses.

```css
body.ThemeContext_dark,
[data-color-mode="dark"] body { --color-bg: #1A1510; }
```

Apply it to **every** dark rule, not just the palette. A theme that flips its
colours but not its header reads as more broken than one that flips nothing,
and generates a second ticket.

Add `color-scheme: dark` in the same block. Without it the browser keeps drawing
light scrollbars, carets and form controls over a dark page — a recurring "dark
mode looks unfinished" report that no colour variable will fix.

**Diagnosis** — toggle dark mode and inspect **both** `<body>` and `<html>`.
Whichever of the class or the attribute changes is the hook that hub uses; the
DOM is the answer, not the customer's memory of a blog post. Screenshot both
elements. Then reload with `?disableCustomCss=true` to confirm the stock theme is
intact underneath — that separates "their CSS is not applying" from "their CSS is
applying and wrong," which have completely different fixes.

---

## 3. A variable name is subtly wrong — and fails silently

**Symptom** — "Some of it worked. The header colour didn't."

**Cause** — an unverified or mistyped custom property. `var(--Header-borderColor)`
resolves to nothing when the real name is `--Header-border-color`. There is no
error. The declaration is valid CSS; it simply computes to empty.

This is the highest-cost failure mode in the entire list, because the customer's
CSS *looks* correct and partially works, so they assume a platform bug.

**Diagnosis**

```css
body { --Header-border-color: red; }   /* bisect with an obvious value */
```

If red appears, the name is right and the problem is elsewhere. If nothing
happens, the name is wrong. Have the customer send their variable list and check
each against ReadMe's documented set — camelCase versus kebab-case is the usual
culprit.

**Prevention** — advise customers never to copy variable names from blog posts or
generated output. AI-generated ReadMe themes routinely invent plausible names —
`--Sidebar-textColor`, `--Header-textColor`, `--tryit-borderColor` — and the
invented ones sit directly beside real ones: `--tryit-background` and
`--Sidebar-border-color` are both documented. A list that is half wrong therefore
looks entirely plausible, which is why eyeballing it does not work.

Two failure shapes to check for, in this order:

1. **camelCase where the real name is kebab-case** — `--Header-borderColor` for
   `--Header-border-color`. The most common single cause.
2. **A name that was never real** — no amount of respelling will fix it. The
   surface needs a documented `.rm-` selector instead.

The only reliable move is to diff the customer's list against the published one
rather than reading it for plausibility.

---

## 4. It worked for months, then broke after a deploy

**Symptom** — "We changed nothing and our theme broke."

**Cause** — the customer targeted hashed/generated class names
(`.Sidebar-module__x7f2a`). ReadMe documents that these change constantly. A
platform deploy rotates the hash and every dependent rule dies at once.

**Fix** — migrate to documented `.rm-` classes, or better, to semantic HTML inside
them:

```css
/* brittle */ .Sidebar-module__x7f2a { … }
/* stable  */ .rm-Sidebar { … }
/* most stable */ .rm-Guides table th { … }
```

**Framing for the customer** — this is not a regression on ReadMe's side, and the
conversation goes better if that is established early and kindly. The selector was
always a private implementation detail. Offer the migration, not the argument.

---

## 5. An entire declaration vanishes — invalid CSS

**Symptom** — "One specific style doesn't apply, everything else is fine."

**Cause** — invalid syntax. The browser discards the *declaration*, silently, and
continues. Three seen in practice:

| Written | Problem |
|---|---|
| `calc(1rem * var(--r) ** 3)` | `calc()` has no `**` operator |
| `border: 4px double solid #000` | two style keywords |
| `var(--x, )` with `--x` unset | empty fallback → empty value |

**Diagnosis** — invalid declarations do not appear in the Styles pane at all. If a
rule's other properties render but one is missing from the listing, that property
is malformed. Paste the block into a CSS validator.

**Note** — the `**` case is worth memorizing. It appears in AI-generated type
scales constantly, and takes out four or five font sizes at once, which the
customer perceives as "my typography is broken" rather than "one line is invalid."

---

## 6. Fonts don't load

**Symptom** — "It falls back to Times."

**Causes, in order of likelihood**

1. `@import` is not the first rule in the stylesheet. Anything before it — even a
   comment is fine, but a rule is not — causes browsers to discard it silently.
2. The panel stripped `@import` on save.
3. CSP or a corporate proxy blocks `fonts.gstatic.com`. Common in enterprise and
   the reason to ask "does it work off the VPN?" early.

**Fix** — move the `<link>` tags to the HTML tab and delete the `@import`. Do not
run both; it double-fetches.

**Recommend `display=swap` regardless** — text paints in the fallback and reflows
when the webfont lands, instead of sitting invisible. On documentation,
readable-then-restyled beats blank-then-perfect.

---

## 7. "We changed the theme and it broke an old version"

**Symptom** — a customer edits CSS for v3 and reports that v1 docs look wrong.

**Cause** — **custom CSS applies to all versions of a project.** ReadMe states this
directly beneath the editor. It is easy to miss and surprising to anyone who
assumes CSS is versioned alongside content.

**Guidance** — version-specific styling must be driven by something in the DOM the
customer can select on, not by the CSS panel. Set expectations before a customer
builds a large version-specific theme, not after.

---

## 8. The theme breaks when the plan changes

**Symptom** — post-downgrade, or post-trial, features disappear.

**Cause** — Custom CSS is Pro and above; Custom JS is Enterprise-only. A theme
whose layout depends on JS degrades hard when a plan changes, and trials expose
Enterprise features to accounts that will not keep them.

**Guidance** — advise CSS-only theming wherever possible. Every decorative element
in the Sherlock theme — stamps, seals, double rules, paper texture, lamp glow — is
CSS. That is a deliberate resilience choice, not an aesthetic one.

---

## 9. Accessibility regressions

**Symptom** — an end user reports unreadable text; or procurement returns a VPAT
question; or an accessibility audit lands.

**Cause** — hand-picked brand palettes routinely fail WCAG AA. The palette in this
directory failed **20 of 45 pairs** as originally written, including the link
colour in dark mode at 3.98:1 and the warning colour at 2.76:1.

**Why this escalates fast** — it is the one category on this list with legal and
procurement consequences. Enterprise buyers ask for conformance statements.

**Fix pattern** — convert to OKLCH, adjust *lightness only*, hold hue and chroma.
The brand colour survives recognizably; only the dimension contrast depends on
moves. Where a colour cannot pass without losing its identity — brass at 4.5:1
becomes olive — split it into a decorative token and a text token rather than
flattening it.

**Tooling** — `sherlock-audit.py` in this directory demonstrates the check:
relative luminance from first principles, every text token against every surface,
non-zero exit on regression. A customer can wire the same idea into CI.

---

## 10. Specificity escalation

**Symptom** — the customer's CSS is a wall of `!important` and new rules stopped
working.

**Cause** — overriding platform rules by escalating specificity. Once everything is
`!important`, nothing can be overridden, including by the customer.

**Fix** — override the *variable*, not the rule, wherever ReadMe exposes one.
`--Header-background` beats fighting `.rm-Header { background }`. Reserve
`!important` for surfaces where the platform genuinely outranks the theme.

---

## Escalation checklist

Collect before escalating to Engineering. Most tickets resolve during collection.

- [ ] Hub URL, and whether the issue reproduces in an incognito window
- [ ] Screenshot of `<body>`'s class list, in both light and dark mode
- [ ] The full contents of the CSS tab (not an excerpt — cascade bugs live in the parts customers consider irrelevant)
- [ ] The HTML and JS tabs, if populated
- [ ] Plan tier, and whether it changed recently
- [ ] Whether the rule appears in DevTools: absent, struck through, or applied-but-empty — this is the single most diagnostic fact
- [ ] Project version, and whether other versions are affected
- [ ] Browser and OS; whether it reproduces off the corporate network

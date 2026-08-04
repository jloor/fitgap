# Crosswalk API

**Find the gap between the work you've done and the work you want — then stage the projects that close it.**

Crosswalk maps a person's evidenced capabilities against a role they want, types the gaps, and stages
concrete projects to close them.

> **Status: design-stage specification.** This repository contains a complete, validated OpenAPI 3.1
> specification and its documentation. There is no implementation yet. The spec is the artifact.

---

## The premise

Most tools in this space score a résumé against a job posting and return a percentage. That number is
close to unactionable, because it collapses three genuinely different situations into one score.

**A "gap" is not one thing.**

| Type | Meaning | What actually closes it |
|---|---|---|
| `blocker` | Genuinely not held | A project producing checkable evidence — or don't pursue the role |
| `partial` | Adjacent experience, not the thing | Honest reframing. Never inflation. |
| `unarticulated` | **Held, but the record doesn't say so** | Asking the right question |

The third type is the reason this exists. Records get written for the job someone *had*, not the job they
want. A line reading "led HL7 and CCDA integration projects" can be complete and accurate while silently
omitting that those integrations included medical imaging systems — because at the time, that was just
Tuesday.

No amount of re-reading the record recovers that. The information isn't in it. Only a question aimed
precisely enough recovers it, which is why **excavation is a first-class operation** rather than a helper
feature. It's the only path that closes a gap at zero cost, because the gap was never real.

## The loop

```
Target ──▶ Analysis ──▶ Gap ──▶ Project ──▶ Evidence ──▶ Inventory
              ▲                                              │
              └──────────────── re-analyze ◀─────────────────┘
```

A **Target** is a role. **Inventory** is what a person can evidence. An **Analysis** produces typed
**Gaps**. A blocker suggests a **Project**; completing one produces **Evidence**, which promotes an
**Inventory** entry — which changes the next Analysis.

## Two design decisions worth knowing about

### Gates halt analysis, enforced by the API

Before any analysis runs, a Target is evaluated against the user's **Filters** — non-negotiable
constraints like location, working hours, or a required compensation range.

`POST /targets/{targetId}/analyses` returns **`409 gate_failed`** when a hard filter didn't pass.

This is deliberately blunt. Analysis costs money and tailoring costs a person's afternoon, and neither is
recoverable. A role that can't be accepted should never consume either. Overrides exist — sometimes the
exception is worth it — but the override and its stated reason are recorded on the Analysis, so a decision
to break your own rule stays visible afterward.

### Requirements carry a bar, not just a keyword

```
exposure → familiarity → experience → proficient → expert
```

"Familiarity with basic scripting in Python" and "proficient in Python" are different requirements wearing
the same keyword. A matcher that scores them identically will send people to spend afternoons on
applications they were never going to clear.

## Repository layout

```
openapi/crosswalk.yaml            The specification (OpenAPI 3.1)
docs/                             Guides, synced to ReadMe via the rdme CLI
changelog/                        Changelog entries, synced the same way
recipes/                          Recipe payload + notes (v2 API; not in the rdme CLI)
.github/workflows/readme-sync.yml CI: lint, dry-run on PRs, publish on push to main
```

## Validate the spec locally

```bash
npx @redocly/cli lint openapi/crosswalk.yaml
```

Or render it interactively:

```bash
npx @redocly/cli preview-docs openapi/crosswalk.yaml
```

## Documentation

The rendered documentation hub is built with [ReadMe](https://readme.com) and synced from `docs/` by CI.

- **Getting Started** — the full loop end to end, with real requests
- **Understanding Gaps** — the design decision the API rests on
- **Debugging Guide: When the API returns 200 and the data is still wrong** — the integration
  troubleshooting process this project came out of
- **Publishing docs from CI with rdme v10** — four failure modes from wiring this pipeline
- **Mapping an API surface you don''t have docs for** — how the recipe endpoint was found

## Why this exists

I spent two months running a job search as a structured process — gates, a capability inventory,
gap analysis per role, and projects staged against the gaps that were real. It worked well enough that
the process was clearly the interesting part, not the search.

Then I found a `critical` gap in my own record that had been wrong for three weeks: I'd been treating
medical imaging as something I hadn't done, when in fact I'd built HL7 interfaces to PACS and DICOM
systems years earlier. It had already cost me one application before anyone thought to ask the question.

That's the bug this API is designed to catch.

## License

MIT © Jonathan Loor

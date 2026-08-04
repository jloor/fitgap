---
category:
  uri: Getting Started
content:
  excerpt: >-
    What Fitgap is, the premise it's built on, and where to go next.
position: 0
privacy:
  view: public
slug: start-here
title: Start Here
---

**Fitgap maps what a person can evidence against a role they want, types the gaps, and stages concrete projects to close them.**

> 📘 **Status: design-stage specification.**
> This project is a complete, validated OpenAPI 3.1 definition and its documentation. There's no running implementation yet — the spec is the artifact. The [API Reference](ref:) is generated directly from it.

## The premise

Most tools in this space score a résumé against a job posting and return a percentage. That number is close to unactionable, because it collapses three genuinely different situations into a single figure.

**A "gap" is not one thing.**

| Type | What it means | What actually closes it |
|---|---|---|
| `blocker` | Genuinely not held | A project producing checkable evidence — or don't pursue the role |
| `partial` | Adjacent experience, not the thing | Honest reframing. Never inflation. |
| `unarticulated` | **Held, but the record doesn't say so** | Asking the right question |

The third row is the reason this exists.

Records get written for the job someone *had*, not the job they want. A line reading "led HL7 and CCDA integration projects" can be completely accurate while silently omitting that those integrations included medical imaging systems — because at the time, that was just Tuesday.

No amount of re-reading the record recovers that. The information isn't in it. Only a question aimed precisely enough recovers it, which is why [excavation](doc:understanding-gaps) is a first-class operation rather than a helper feature. It's the only path that closes a gap at zero cost, because the gap was never real.

## The loop

```
Target ──▶ Analysis ──▶ Gap ──▶ Project ──▶ Evidence ──▶ Inventory
              ▲                                              │
              └──────────────── re-analyze ◀─────────────────┘
```

A **Target** is a role. **Inventory** is what a person can evidence. An **Analysis** produces typed **Gaps**. A blocker suggests a **Project**; completing one produces **Evidence**, which promotes an **Inventory** entry — which changes the next Analysis.

## Gates run before analysis, and they halt it

Before any analysis happens, a Target is evaluated against the user's **Filters** — non-negotiable constraints like location, working hours, or a required compensation range.

`POST /targets/{targetId}/analyses` returns **`409 gate_failed`** when a hard filter didn't pass.

This is deliberately blunt. Analysis costs money and tailoring costs a person's afternoon, and neither is recoverable. A role that can't be accepted should never consume either.

Overrides exist — sometimes the exception is worth making — but the override and its stated reason are recorded on the Analysis. Deciding to break your own rule is fine. Forgetting that you broke it is not.

## Where to go next

- **[Getting Started](doc:getting-started)** — walk the whole loop end to end with real requests
- **[Understanding Gaps](doc:understanding-gaps)** — the design argument the API rests on
- **[Debugging Guide: When the API returns 200 and the data is still wrong](doc:debugging-silent-failures)** — the integration troubleshooting process this project came out of
- **[API Reference](ref:)** — generated from `openapi/fitgap.yaml`

## Source

The specification, these guides, and the CI pipeline that publishes them live at
[github.com/jloor/fitgap](https://github.com/jloor/fitgap).

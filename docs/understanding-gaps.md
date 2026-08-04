---
category:
  uri: Guides
title: Understanding Gaps
slug: understanding-gaps
content:
  excerpt: >-
    Why a gap is not one thing — and why collapsing three different situations
    into one score makes the result unactionable.
privacy:
  view: public
position: 0
---

The design decision the whole API rests on.

## A gap is not one thing

Résumé-matching tools return a number: *72% match*. That number is close to unactionable, because it collapses three genuinely different situations into one score.

### `blocker` — you haven't done it

Real, and no amount of clever wording fixes it. The honest responses are to close it with a project that produces evidence, or to decide the role isn't worth pursuing.

What doesn't work: claiming it anyway. It surfaces in week three, and by then it's a credibility problem rather than a skills problem.

### `partial` — adjacent, not identical

You've done something that rhymes. Grafana and Loki when they asked for Kibana. Ambulatory EHR when they asked for skilled-nursing operations.

The right response is naming it accurately and letting the reader decide. Stating a limitation precisely reads as *more* credible, not less — it signals you know where your edges are, which is a hiring signal in its own right.

### `unarticulated` — you have it, and your record doesn't say so

The one everybody misses, and usually the most valuable.

This happens because records are written for the job someone had, not the job they want. A line reading "led HL7 and CCDA integration projects" is accurate and complete for the role it describes — and silently omits that those integrations included PACS and DICOM imaging systems, because at the time that was just Tuesday.

**No amount of re-reading the record surfaces it.** The information isn't there. The only thing that recovers it is a question aimed precisely enough that the person thinks *oh — yes, that.*

That's why `excavationQuestions` is a field on the Gap object and `POST /gaps/{gapId}/excavations` is a first-class endpoint. Excavation isn't a helper feature; it's the highest-value operation in the API, because it closes gaps at zero cost.

## Read the bar, not the keyword

Every requirement carries a `bar`:

```
exposure → familiarity → experience → proficient → expert
```

Two postings both say "Python." One asks for *familiarity with basic scripting in Python or Bash*; the other requires someone *proficient in Python*. A keyword matcher scores those identically.

They are not remotely the same requirement, and the difference decides whether an application is worth an afternoon.

## Gates run first, and they halt

`POST /targets/{targetId}/analyses` returns `409 gate_failed` when a hard filter didn't pass.

This is deliberately blunt. Analysis costs money and tailoring costs a person's afternoon, and neither is recoverable. A role that can't be accepted — wrong location, no stated range, a schedule that doesn't work — should never consume either.

Overrides exist, because sometimes the exception is worth it. But the override and its stated reason are recorded on the Analysis, so three weeks later you can see *why* effort went into something you'd ruled out.

Deciding to break your own rule is fine. Forgetting that you broke it is not.

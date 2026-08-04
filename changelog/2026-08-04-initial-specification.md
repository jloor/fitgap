---
title: v0.1.0 — Initial specification
type: added
---

The first published version of the Fitgap API definition: **14 paths, 19 operations, 20 schemas**, in OpenAPI 3.1.

Three design decisions are worth calling out, because they're the ones that shaped everything else.

**Gaps are typed, not scored.** `GapType` is one of `blocker`, `partial`, or `unarticulated`. Résumé-matching tools return a percentage, which collapses three situations that need three different responses. The `unarticulated` case — a capability the person genuinely holds that their record doesn't mention — is the one this API exists for.

**Gates halt analysis, and the API enforces it.** `POST /targets/{targetId}/analyses` returns `409 gate_failed` when a hard filter didn't pass. Overrides are available and are recorded on the Analysis along with a stated reason, so a decision to break your own rule stays visible afterwards.

**Requirements carry a bar.** `exposure → familiarity → experience → proficient → expert`. "Familiarity with Python" and "proficient in Python" are different requirements wearing the same keyword, and scoring them identically is the most common failure in this category of tool.

Excavation is a first-class endpoint rather than a helper: `POST /gaps/{gapId}/excavations` accepts answers to targeted questions and can resolve a gap outright, writing a new Inventory entry in the process. It's the only path that closes a gap at zero cost, because the gap was never real.

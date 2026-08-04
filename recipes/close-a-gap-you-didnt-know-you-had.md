# Recipe source: "Close a gap you didn't know you had"

> ⚠️ **Not synced by CI.** ReadMe Recipes are built in the dashboard — `rdme` v10 has no recipe or
> tutorial command. This file is the version-controlled source; build from it at
> **Dashboard → Recipes → New Recipe**, and update this file if the recipe changes.

**Slug:** `close-a-gap-you-didnt-know-you-had`
**Estimated time:** 5 minutes

**Excerpt / description:**
> Walk the Crosswalk loop against a real role — and watch a `critical` gap close with a single question,
> because it was never a real gap.

**Why this recipe and not "getting started":** the excavation path is the one thing this API does that
nothing else does. A recipe that just demonstrates CRUD teaches the reader nothing they couldn't get from
the reference. This one ends on the product's actual argument.

---

## Step 1 — Set your gates

**Endpoint:** `PUT /filters` (`replaceFilters`)

**Body:**

Constraints you won't trade away. These are evaluated on every target *before* any analysis runs — a
`hard` filter that fails blocks analysis entirely, a `soft` one only raises a flag.

The point is unrecoverable cost. Analysis spends money and tailoring spends an afternoon; a role you
couldn't accept should consume neither.

**Request:**

```json
{
  "filters": [
    {
      "id": "flt_remote",
      "label": "Remote, or commute under 45 minutes",
      "kind": "hard",
      "rule": "Role must be remote, or on-site within 45 minutes of New York, NY."
    },
    {
      "id": "flt_band",
      "label": "Posted salary range",
      "kind": "hard",
      "rule": "Posting must state a compensation range."
    }
  ]
}
```

---

## Step 2 — Add the role you're considering

**Endpoint:** `POST /targets` (`createTarget`)

**Body:**

Paste the posting. Crosswalk parses it into structured requirements and evaluates your gates immediately —
the gate result comes back on creation, not later.

Note that each requirement carries a `bar`. "Familiarity with Python" and "proficient in Python" are
different requirements wearing the same keyword.

**Request:**

```json
{
  "title": "Senior Data Migration Engineer",
  "organization": "Example Health",
  "sourceText": "Advanced T-SQL. End-to-end migrations between production systems. Experience with RIS, PACS, EHR or similar healthcare applications. Developing or maintaining C# applications."
}
```

---

## Step 3 — Run the analysis

**Endpoint:** `POST /targets/{targetId}/analyses` (`createAnalysis`)
**Path param:** `targetId` = `tgt_91aF`

**Body:**

If a hard filter failed, this returns `409 gate_failed` and produces nothing. That's deliberate.

You can override with `overrideGate: true` and a reason — but the override is recorded on the Analysis, so
three weeks later you can still see why you spent effort on something you'd ruled out. Breaking your own
rule is fine. Forgetting you broke it isn't.

---

## Step 4 — Read the gaps

**Endpoint:** `GET /analyses/{analysisId}/gaps` (`listGaps`)
**Path param:** `analysisId` = `ana_04Bq`

**Body:**

Two gaps come back, and they are not the same kind of problem.

The **C# requirement** is typed `blocker` — genuinely not held. That one needs a project, or a decision not
to pursue the role.

The **healthcare/imaging requirement** is typed `unarticulated` and marked `critical`. Crosswalk isn't
saying you lack it. It's saying your record doesn't evidence it, while your history makes absence unlikely
— so instead of a verdict, it returns a question.

---

## Step 5 — Answer the question

**Endpoint:** `POST /gaps/{gapId}/excavations` (`submitExcavation`)
**Path param:** `gapId` = `gap_5Qw2`

**Body:**

This is the step the API exists for.

**Request:**

```json
{
  "answers": [
    {
      "questionId": "qst_01",
      "answer": "Yes — I worked with PACS and DICOM systems as an HL7 Engineer. Merge and Sectra on the radiology and orthopaedic side, Zeiss and Optos in ophthalmic imaging."
    }
  ]
}
```

---

## Step 6 — Watch it resolve

**Endpoint:** `GET /gaps/{gapId}` (`getGap`)
**Path param:** `gapId` = `gap_5Qw2`

**Body:**

`resolved: true`, and a new Inventory entry now exists. The next analysis of *any* target reads the
improved record, so this gap won't appear again.

A `critical` gap closed with one question and no new work — because it was never real. It lived in the
record, not the person.

The `blocker` is still there, and still needs a project. That distinction is the whole point: one of these
was a capability problem and one was a documentation problem, and treating them the same way is how people
end up studying for things they already know.

---

## Success message

> **You just closed a gap by asking rather than working.**
>
> The `blocker` still stands and still needs evidence — see `GET /gaps/{gapId}/projects` for projects sized
> to produce something checkable. But the `critical` one is gone, and it took a sentence.
>
> The most expensive gaps are the ones nobody thinks to interrogate.

---

## Build notes

- Link every step to its endpoint in the API Reference so the **try-it explorer** is live in each one —
  that's the feature that makes a recipe better than a guide, and a recipe without it is just a page.
- Keep step bodies short. The reasoning lives in [Understanding Gaps](doc:understanding-gaps); the recipe
  should stay in the imperative.
- Steps 4 → 5 are the emotional turn. Don't compress them into one step; the reader needs to see the
  `unarticulated` type *before* the question resolves it, or the payoff doesn't land.

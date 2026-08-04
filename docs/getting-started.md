---
title: Getting Started
slug: getting-started
content:
  excerpt: >-
    Walk the full Crosswalk loop end to end — gates, targets, analysis,
    excavation, and staged projects.
position: 1
privacy:
  view: public
---

This walks the full Crosswalk loop end to end: define your constraints, add a target, run an analysis, close a gap, and watch your inventory change.

> 📘 All requests use `Authorization: Bearer <key>`. The sandbox server is seeded with fixtures and persists nothing.

## 1. Set your gates

Gates are non-negotiable constraints. They're evaluated on every target you create, **before** any analysis runs.

```bash
curl -X PUT https://api.crosswalk.example/v1/filters \
  -H "Authorization: Bearer $CROSSWALK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

> 🚧 **`hard` filters block analysis. `soft` filters only raise a flag.**
> This distinction is the whole point of gates. Tailoring effort is unrecoverable — you don't get the afternoon back — so a role you couldn't accept should never reach the analysis step.

## 2. Add a target

```bash
curl -X POST https://api.crosswalk.example/v1/targets \
  -H "Authorization: Bearer $CROSSWALK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Data Migration Engineer",
    "organization": "Example Health",
    "sourceText": "Advanced T-SQL. End-to-end migrations between production systems. Experience with RIS, PACS, EHR or similar healthcare applications. Developing or maintaining C# applications..."
  }'
```

The response includes parsed `requirements` and the gate result:

```json
{
  "id": "tgt_91aF",
  "title": "Senior Data Migration Engineer",
  "gateStatus": "passed",
  "gateResults": [
    { "filterId": "flt_remote", "passed": true, "reason": "Fully remote, EST hours." },
    { "filterId": "flt_band", "passed": true, "reason": "Rate stated." }
  ],
  "requirements": [
    { "id": "req_01", "text": "Advanced Microsoft SQL Server (T-SQL)", "bar": "expert", "required": true },
    { "id": "req_04", "text": "Working within healthcare IT environments (RIS, PACS, EHR, EMR)", "bar": "experience", "required": true },
    { "id": "req_07", "text": "Developing or maintaining C# applications", "bar": "experience", "required": true }
  ]
}
```

> 📘 **Note the `bar` field.**
> "Familiarity with Python" and "proficient in Python" are different requirements wearing the same keyword. Matching on the keyword and ignoring the bar is the most common failure in this category of tool. See [Understanding Gaps](doc:understanding-gaps).

## 3. Run the analysis

```bash
curl -X POST https://api.crosswalk.example/v1/targets/tgt_91aF/analyses \
  -H "Authorization: Bearer $CROSSWALK_KEY"
```

```json
{
  "id": "ana_04Bq",
  "targetId": "tgt_91aF",
  "gapCount": { "blocker": 1, "partial": 0, "unarticulated": 1 },
  "summary": "Strong on migration and T-SQL. One real blocker (C#). One requirement flagged as possibly present but unevidenced."
}
```

> ❗ **If a hard filter failed, this returns `409 gate_failed`** and no analysis is produced. Pass `overrideGate: true` with an `overrideReason` to proceed anyway — the override is recorded on the analysis, so the decision stays visible later.

## 4. Look at the gaps

```bash
curl https://api.crosswalk.example/v1/analyses/ana_04Bq/gaps \
  -H "Authorization: Bearer $CROSSWALK_KEY"
```

```json
{
  "data": [
    {
      "id": "gap_3Xz8",
      "requirementText": "Developing or maintaining C# applications",
      "bar": "experience",
      "type": "blocker",
      "severity": "major",
      "rationale": "Inventory lists C# as a skill with no shipped work attached."
    },
    {
      "id": "gap_5Qw2",
      "requirementText": "Working within healthcare IT environments (RIS, PACS, EHR, EMR)",
      "bar": "experience",
      "type": "unarticulated",
      "severity": "critical",
      "rationale": "Inventory evidences EHR/EMR/PM depth. Imaging is unevidenced — but a prior role as an HL7 integration engineer makes absence unlikely.",
      "excavationQuestions": [
        { "id": "qst_01", "question": "In your HL7 integration work, did you build interfaces to any imaging systems? If so, which vendors?" }
      ]
    }
  ]
}
```

## 5. Excavate — the cheapest gap to close

The second gap isn't a capability gap. It's a **record** gap. Answer the question:

```bash
curl -X POST https://api.crosswalk.example/v1/gaps/gap_5Qw2/excavations \
  -H "Authorization: Bearer $CROSSWALK_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": "qst_01",
        "answer": "Yes — I worked with PACS and DICOM systems as an HL7 Engineer. Merge and Sectra on the radiology and orthopaedic side, Zeiss and Optos in ophthalmic imaging."
      }
    ]
  }'
```

```json
{
  "gap": { "id": "gap_5Qw2", "resolved": true },
  "resolved": true,
  "inventoryEntryCreated": "inv_7Kd2"
}
```

A `critical` gap closed with one question and zero new work, because it was never real.

> 📘 **This is a true story.**
> That gap existed in my own record for three weeks. Every evaluation I ran treated medical imaging as something I hadn't done — including one for a healthcare AI *imaging* company, where I under-sold myself in an application that had already gone out. Nobody asked me the question, so I never answered it.
>
> The most expensive gaps are the ones nobody thinks to interrogate.

## 6. Stage a project for the gap that *is* real

```bash
curl https://api.crosswalk.example/v1/gaps/gap_3Xz8/projects \
  -H "Authorization: Bearer $CROSSWALK_KEY"
```

Suggestions are sized to produce **checkable evidence**, not study plans:

```json
{
  "data": [
    {
      "title": "Rebuild one internal utility as a small C# console app and publish it",
      "rationale": "The requirement is maintenance of data-plumbing utilities — file parsing, Excel I/O, crosswalks, format conversion. Evidence beats a course certificate here.",
      "evidenceKind": "repository",
      "estimatedEffort": "days"
    }
  ]
}
```

Stage it, complete it, then attach evidence via `POST /projects/{projectId}/evidence`. That promotes the linked inventory entry — and the next analysis of any target reads the improved record.

The loop closes.

---
category:
  uri: Guides
title: 'Debugging Guide: When the API returns 200 and the data is still wrong'
slug: debugging-silent-failures
content:
  excerpt: >-
    The integration troubleshooting process this project came out of — for the
    failures that don't announce themselves.
privacy:
  view: public
position: 2
---

> 📘 This guide isn't about Crosswalk specifically. It's the debugging process I've used for twenty years across integrations with 30+ external systems, written down.

The hardest integration problems aren't the ones where something is broken. Those announce themselves — a 500, a timeout, a stack trace, an alert.

The expensive ones are where **everything is technically working and the outcome is still wrong.** The call succeeds. The response is `200`. Both sides can point at green dashboards. And the data on the other end is subtly, consequentially incorrect.

Here's the order I work through it.

## 1. Verify the contract before the payload

Before examining what was sent, establish what was *supposed* to be sent.

The OpenAPI spec is the artifact of record. Not the integration guide someone wrote by hand, not what the other team remembers — the spec.

```bash
curl -s https://api.example.com/openapi.json | jq '.paths."/orders".post.requestBody'
```

Half of "the data is wrong" problems end here, because two teams were working from different versions of the same contract.

> 🚧 **Watch for optional fields with implied semantics.**
> A field that's optional in the spec but required by downstream business logic is the single most common source of silent failure. The spec permits omitting it. The system misbehaves when you do. Nothing errors.

## 2. Verify what actually went over the wire

Not what the client *intended* to send. What arrived.

```bash
curl -v -X POST https://api.example.com/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @payload.json
```

For browser-originated traffic, capture a HAR from Chrome DevTools' Network tab and inspect the real request body. For anything complex, replay it in Postman or Bruno so you can vary one field at a time.

**Diff the actual payload against the spec.** Type coercion is where this usually goes wrong: a string `"0"` where a number was expected, a boolean serialized as `"false"`, a `null` where the field should have been omitted entirely. All of these return `200`. None of them do what you wanted.

## 3. Verify authorization *scope*, not authorization success

A request can authenticate perfectly and still be silently filtered.

This is the failure mode people miss most, because auth "worked." The token was valid. The call succeeded. But the token's scope excluded a subset of records, so the response is complete and correct — for a smaller world than you meant to query.

Check what the credential is entitled to, not whether it was accepted.

## 4. Verify the destination state, not the response body

`200 OK` means the request was accepted. It does not mean the record looks the way you think.

Go read it back:

```sql
SELECT order_id, status, updated_at, source_system
FROM orders
WHERE external_ref = 'ABC-123';
```

Compare against what you sent. This is where you find the transform that ran, the default that got applied, the trigger nobody mentioned, or the field that was accepted and quietly discarded.

## 5. Verify timing and ordering assumptions

If everything above checks out, the fault is usually **between** the systems rather than in either one.

Two systems agree on the payload and disagree about sequence. An update arrives before the record it updates. A webhook fires twice and the second overwrites a change made in between. A nightly job re-syncs and reverts your write six hours later.

These reproduce only under real timing, which is why they survive testing and appear in production.

## Symptom → first check

| Symptom | Likely cause | Check first |
|---|---|---|
| Some records correct, others not | Auth scope, or a conditional transform | Compare a working and non-working record side by side |
| Correct on retry, wrong the first time | Ordering or race condition | Sequence and timestamps of both calls |
| Field present but empty | Type coercion or optional-field semantics | The raw payload against the spec |
| Correct at write, wrong later | Downstream job or trigger | `updated_at` and the last writer |
| Correct in staging, wrong in production | Config or version drift | Spec version and environment config diff |

## When you hand it to engineering

If you've worked through the above and it's genuinely a defect, the handoff should make it reproducible without a conversation:

- **Symptom**, in one sentence
- **Reproduction steps**, exact, including the payload
- **Expected vs. actual**, with the read-back showing actual
- **Impact** — how many customers, how many records, is it ongoing
- **What you already ruled out** — so nobody repeats your last three hours

That last one is the bullet support engineers skip and engineers most appreciate.

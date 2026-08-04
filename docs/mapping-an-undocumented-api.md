---
category:
  uri: Guides
content:
  excerpt: >-
    How to work out what an API can actually do when the CLI, the docs, and the
    error codes all disagree — with a worked example that I got wrong first.
position: 3
privacy:
  view: public
slug: mapping-an-undocumented-api
title: Mapping an API surface you don't have docs for
---

Sooner or later you need to know whether a platform can do something, and the available evidence
disagrees with itself. The CLI has no command for it. The docs don't mention it. An endpoint returns a
suggestive error. Somebody on a forum says it's not supported.

This is the process I use, written up around a real example — including the step I skipped, which made me
confidently wrong for about twenty minutes.

## The setup

I needed to create a **Recipe** in ReadMe programmatically. The evidence said no:

```bash
$ npx rdme@latest --help
TOPICS
  changelog    custompages    docs    openapi    reference
```

No recipe command. No tutorial command. Reasonable conclusion: recipes are dashboard-only.

That conclusion was wrong, and the CLI was never good evidence for it. **A CLI is a curated subset of an
API, chosen by whoever maintains the CLI.** Absence from it means nothing about the API.

## 1. Distinguish "doesn't exist" from "not allowed" — then verify your discriminator

The v1 API looked promising:

```bash
$ curl -u "$KEY:" https://dash.readme.com/api/v1/recipes
403 {"error":"API_ACCESS_UNAVAILABLE","message":"Your project does not have access to this API."}
```

`403` rather than `404` normally means *the endpoint is real and you can't use it*. I took that at face
value and reported that recipes existed in v1 but were blocked.

Then I ran the control:

```bash
$ curl -u "$KEY:" https://dash.readme.com/api/v1/definitely-not-a-real-endpoint
403 {"error":"API_ACCESS_UNAVAILABLE", ...}
```

Every v1 path returns 403 on this project type. The status code carried no information at all.

> 🚧 **Always test your discriminator against a value you know is false.**
> A signal that returns the same answer for real and nonsense inputs isn't a signal. This is the cheapest
> possible check and I skipped it, which is the only reason I got the wrong answer.

## 2. Probe the surface systematically

With v1 ruled out, walk v2 by construction. Guess plausible shapes and read status codes:

```
/v2/recipes                        404
/v2/tutorials                      404
/v2/projects/me/recipes            404
/v2/branches                       200   ←
/v2/branches/stable                200
/v2/branches/stable/guides         404
/v2/branches/stable/recipes        200   ← there it is
/v2/branches/stable/apis           200
```

The resource wasn't top-level, it was nested under a branch. Note that `/v2/branches/stable/guides`
returns 404 while `/recipes` returns 200 — the naming isn't consistent, which is exactly why guessing one
path and stopping would have failed.

## 3. Let validation errors write the schema for you

Once you've found the endpoint, `POST` an empty object. A well-built API will enumerate what it wants:

```bash
$ curl -X POST .../recipes -d '{}'
{
  "status": 422,
  "errors": [
    { "key": "content",     "message": "Required" },
    { "key": "description", "message": "Required" },
    { "key": "title",       "message": "Required" }
  ]
}
```

Three fields, for free. Then narrow one level at a time — send `content` as a string to learn it wants an
object, send it as an empty object to learn which sub-keys are mandatory.

## 4. Watch for silent strips — "no error" is not "accepted"

This one costs people hours. I sent a step object with plausible field names:

```json
{ "content": { "steps": [{ "title": "S", "body": "B", "code": "X", "api": {} }] } }
```

`200 OK`. And in the response:

```json
{ "steps": [] }
```

No error. No warning. The step was dropped because the keys didn't match the schema, and the API told me
nothing about it.

> ❗ **Always diff what you sent against what came back.**
> A success status describes the *request*, not your intent. If a field you sent isn't in the response, it
> was discarded — and that's a silent failure of exactly the kind that produces "the API said 200 and the
> data is still wrong."

## 5. Read the schema off something that already works

When probing stalls, stop guessing and find a working instance. Export it:

```bash
$ rdme docs export ./tmp --key="$KEY"
```

```yaml
category:
  uri: Getting Started     # a NAME, not an ID — which no amount of guessing would have produced
position: 0
```

Existing objects are documentation that can't drift, because they're what the API actually accepted.

## 6. Clean up after yourself

Probing creates junk. I left two test recipes called `t` on a live project and had to go back for them.

```bash
$ curl -X DELETE .../recipes/t     # 204
```

Probe on a non-production project where you can. Where you can't, keep a list of everything you created
and delete it in the same session — not later, when you've forgotten what was real.

> 🚧 **Rapid-fire probing gets rate-limited**, and rate-limit responses can arrive as `500`s rather than
> `429`s. If deletes suddenly fail, wait ten seconds before concluding anything is broken. I briefly
> thought the delete endpoint didn't work; it was throttling.

## The general principle

Every step above is the same move: **find the thing that will tell you the truth, and stop trusting the
things that only look like they will.**

A CLI's command list looks authoritative and isn't. A status code looks meaningful until you test it
against a known-false input. A `200` looks like acceptance until you diff the response. Documentation
looks current until the version moved underneath it.

The one source that never lies is a working example — which is why step 5 resolves things that steps 1
through 4 can't.

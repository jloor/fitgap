# Recipes

Recipes are **API-authorable** — they're just not in the `rdme` CLI.

`rdme` v10 has no recipe or tutorial command, which makes it look like recipes are dashboard-only. They
aren't. The v2 API exposes them under the branch:

```
GET    /v2/branches/{branch}/recipes
POST   /v2/branches/{branch}/recipes
GET    /v2/branches/{branch}/recipes/{slug}
PATCH  /v2/branches/{branch}/recipes/{slug}
DELETE /v2/branches/{branch}/recipes/{slug}
```

> ⚠️ The **v1** API (`/api/v1/recipes`) returns `403 API_ACCESS_UNAVAILABLE` on Git-backed projects — as
> does every v1 path, including ones that don't exist. That 403 is a blanket block, so it tells you nothing
> about whether an endpoint is real. Check v2 before concluding something isn't available.

## The data model is a code walkthrough, not a wizard

This is the part worth knowing before you design one. A recipe is **one code snippet** plus steps that
**highlight line ranges within it** — not a sequence of independent API calls.

```jsonc
{
  "title": "…",
  "description": "…",                 // required
  "content": {                        // all three keys required together
    "steps": [
      {
        "title": "…",                 // required
        "body": "…",                  // markdown, nullable
        "line_numbers": ["1-7"]       // ranges into the snippet below
      }
    ],
    "snippet": {
      "code_options": [
        { "code": "…", "language": "bash", "name": "…" }
      ]
    },
    "response": "…"                   // nullable; shown as the result
  }
}
```

> 🚧 **Unknown keys on a step are silently stripped** and the step is dropped from the response — no error.
> If your steps come back as `[]`, you used field names the schema doesn't recognise. And `content` must
> carry `steps`, `snippet`, and `response` together; sending `steps` alone resets the rest to defaults.

## Publishing

`close-a-gap-you-didnt-know-you-had.json` is the live recipe, exported from the API. To re-create it:

```bash
curl -X POST https://api.readme.com/v2/branches/stable/recipes \
  -H "Authorization: Bearer $README_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @recipes/close-a-gap-you-didnt-know-you-had.json
```

To update in place, `PATCH` the same body to `…/recipes/close-a-gap-you-didnt-know-you-had`.

This isn't wired into CI. It's a single artifact that changes rarely, and the payload is checked in — so
re-creating it is one command rather than a pipeline stage.

## The recipe

**[Close a gap you didn't know you had](https://docs.jonathanloor.com/recipes/close-a-gap-you-didnt-know-you-had)**

Six steps over a 34-line curl walkthrough of the whole loop: gates → target → analysis → gaps →
excavation → resolution.

Steps 4 and 5 are the turn, and they're deliberately not merged. The reader has to see the gap typed
`unarticulated` *before* the question resolves it, or the point doesn't land: one of the two gaps was a
capability problem and the other was a documentation problem, and they need completely different responses.

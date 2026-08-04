---
category:
  uri: Guides
content:
  excerpt: >-
    Notes from wiring this project's docs pipeline to ReadMe with rdme v10 —
    including four failure modes and how each one was isolated.
position: 2
privacy:
  view: public
slug: publishing-docs-from-ci
title: Publishing docs from CI with rdme v10
---

Everything in this project publishes from a `git push`. The OpenAPI definition and these guides live in
[the repo](https://github.com/jloor/fitgap); a GitHub Action lints the spec and then uploads both
through ReadMe's `rdme` CLI.

Getting there took four attempts. The failures are worth writing down, because each one is a different
class of problem and the last two were genuinely non-obvious.

> 📘 Verified against **rdme v10.9.4**, August 2026. If you're reading this much later, check
> `npx rdme@latest --help` first — the command surface has moved before.

## 1. The commands moved between major versions

Older examples across the internet use a flatter command shape. In v10:

| Older form | v10 |
|---|---|
| `rdme openapi <spec>` | `rdme openapi upload <spec>` |
| `rdme docs <path>` | `rdme docs upload <path>` |
| `--version` | `--branch` (defaults to `stable`) |

Also required in automation:

```bash
npx rdme@latest openapi upload openapi/fitgap.yaml \
  --key="$README_API_KEY" \
  --confirm-overwrite
```

> 🚧 **`--confirm-overwrite` is not optional in CI.**
> Without it the command prompts for confirmation. A prompt in a runner isn't a failure — it's a hang
> until the job times out, which is a much worse debugging experience than an error.

## 2. The frontmatter schema changed

Guides need YAML frontmatter, and v10 expects:

```yaml
---
category:
  uri: Guides
content:
  excerpt: >-
    A one-line summary.
position: 2
privacy:
  view: public
slug: publishing-docs-from-ci
title: Publishing docs from CI with rdme v10
---
```

Note `content.excerpt` is nested, `position` replaces the older `order`, and `privacy.view` replaces
`hidden`.

The CLI detects outdated frontmatter and offers to rewrite it in place, which is a good affordance —
run it locally before you rely on it in CI:

```bash
npx rdme@latest docs upload ./docs --key="$README_API_KEY" --dry-run
```

## 3. A passing page can hide a failing one

After the auto-fix, `--dry-run` reported **no issues** and CI still failed:

```
🔄 Successfully updated 1 page(s) in ReadMe:
   - getting-started
🚨 Received errors when attempting to upload 2 page(s):
   - understanding-gaps: We encountered validation errors while processing your input.
```

Running a single file surfaced the real error:

```
1. category: Required
```

**The auto-fixer had removed `category`, and the API requires it for new pages.**

The reason only two of three files failed is the interesting part: a new ReadMe project ships with seeded
content at the slug `getting-started`. That page already had a category, so uploading to it was an
*update* and succeeded. Only the two genuinely new pages hit the create path.

> 🚧 **The lesson generalises well beyond this tool.** A partial success is more misleading than a total
> failure. One-of-three passing made this look like a content problem in two specific files, when it was a
> schema problem affecting all three — masked by the fact that one file happened to take a different code
> path.
>
> When some records work and others don't, the first question is *what's different about the ones that
> pass*, not *what's wrong with the ones that fail*.

## 4. Git-backed projects can't introspect over the v1 API

The obvious next step was to list valid categories:

```bash
curl -s -u "$README_API_KEY:" https://dash.readme.com/api/v1/categories
```

```json
{
  "error": "API_ACCESS_UNAVAILABLE",
  "suggestion": "Your project uses our Git-backed systems, which prevents access to this API."
}
```

So the introspection route was closed.

**What worked instead: export the page that already succeeded and read the schema off it.**

```bash
npx rdme@latest docs export ./tmp --key="$README_API_KEY"
```

```yaml
category:
  uri: Getting Started
position: 0
slug: getting-started
```

`category.uri` takes a category **name**, not an ID — and referencing a name that doesn't yet exist
creates that category. That's what the API wanted all along.

## The working pipeline

```yaml
- name: Lint OpenAPI spec
  run: npx --yes @redocly/cli@latest lint openapi/fitgap.yaml

- name: Upload OpenAPI definition
  run: |
    npx --yes rdme@latest openapi upload openapi/fitgap.yaml \
      --key="${{ secrets.README_API_KEY }}" \
      --confirm-overwrite

- name: Upload guides
  run: |
    npx --yes rdme@latest docs upload ./docs \
      --key="${{ secrets.README_API_KEY }}"
```

Lint before upload, so a malformed definition never reaches the project. Dry-run on pull requests, so
frontmatter problems surface before they reach `main`. The full workflow is
[in the repo](https://github.com/jloor/fitgap/blob/main/.github/workflows/readme-sync.yml).

## If you're debugging your own sync

1. `--dry-run` first, always. It validates frontmatter without touching the project.
2. If a batch fails, **run one file at a time** — batch output summarises, single-file output gives you
   the actual API error.
3. If some files pass and others fail, ask what's different about the ones that pass before investigating
   the ones that don't.
4. If an introspection endpoint is unavailable, export existing state and read the schema from something
   that already works.

---
title: Documentation now publishes from CI
type: added
---

The specification and every guide in this project now publish automatically from a `git push` to `main`.

The pipeline lints the OpenAPI definition with Redocly before anything is uploaded, so a malformed spec never reaches the project. Pull requests run `--dry-run` uploads, which surface frontmatter problems before they reach the default branch. Merges publish the definition and the guides through ReadMe's `rdme` CLI.

Source: [github.com/jloor/crosswalk-api](https://github.com/jloor/crosswalk-api)

Getting there took four attempts, and the failure modes are documented in [Publishing docs from CI with rdme v10](doc:publishing-docs-from-ci) — including one where a passing page masked a schema error affecting all three files.

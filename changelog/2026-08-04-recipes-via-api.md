---
title: Recipes now published from the API
type: added
---

The [Close a gap you didn't know you had](https://docs.jonathanloor.com/recipes/close-a-gap-you-didnt-know-you-had) recipe walks the whole loop in six steps — gates, target, analysis, gaps, excavation, resolution — over a single annotated request script.

It's created through the v2 API rather than the dashboard, which took some working out: recipes aren't in the `rdme` CLI, and the v1 endpoint returns a 403 that looks meaningful and isn't. The technique is written up in [Mapping an API surface you don't have docs for](doc:mapping-an-undocumented-api), including the control test I skipped and the twenty minutes it cost.

The payload is checked into the repo, so the recipe can be re-created with a single `curl`.

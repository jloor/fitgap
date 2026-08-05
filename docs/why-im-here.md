---
category:
  uri: About
content:
  excerpt: >-
    Jonathan Loor — twenty years in technical support, and why this project
    exists.
position: 0
privacy:
  view: public
slug: why-im-here
title: Why I'm here
---

Hi. I'm Jonathan Loor, and this is my application.

You asked for a page about who I am and why I want to work here. Twenty years in technical support, and the through-line is that I'm the person who answers a question until he writes it down. Runbooks, escalation procedures, a Jira self-service portal that took the repeat questions out of the queue entirely.

So rather than describe that, I built you something.

**[Fitgap](doc:start-here)** is a complete OpenAPI 3.1 design for a problem I've been living inside for the last two months: finding the gap between the work someone has done and the work they want, and staging projects to close it. The spec, the guides, and the pipeline that publishes them are at **[github.com/jloor/fitgap](https://github.com/jloor/fitgap)**.

For a job about documentation, showing seemed better than telling.

## Then I built you a second one, by accident

I wanted a decent colour palette for this hub. Half a day later I had **[ReadMe Theme Forge](https://readme-css.jonathanloor.com)**, a tool that generates accessible custom CSS for a ReadMe hub. Pick one of 24 templates, adjust any of the 13 colour tokens, paste the result. Source at **[github.com/jloor/readme-theme-forge](https://github.com/jloor/readme-theme-forge)**, MIT.

It exists because theming a hub taught me four things I didn't expect, and all of them fail quietly:

- Variables declared on `:root` do nothing, because your platform loads its own `:root` after custom CSS and wins on later declaration.
- Invented variable names look right and do nothing. `--Header-textColor` isn't real. `--tryit-background` is. They sit next to each other in the same list.
- Dark mode has two hooks, `.ThemeContext_dark` on the body and the documented `[data-color-mode]`. They are different claims. I keyed off one and had a dark mode that was dead rather than merely wrong.
- Your syntax highlighter ships colours tuned for a dark code surface. On a light one I measured them at 1.0–1.7:1.

I found the last two by screenshotting the live hub and sampling pixels. My contrast audit passed the whole time: it checks the palette, which isn't the same as checking the page. A credentials field on my own audited theme was sitting at **1.76:1**.

## And then the ending I deserved

The hub you are reading this on is a **Starter** project, and custom CSS is Pro and above. So I cannot apply any of it here.

I found that out the way a customer would. The CSS saves fine. It comes back down in the page payload. It is never injected. Sixteen occurrences of my variables in the JSON, none in a `<style>` block. Nothing errors, nothing warns, and the page looks the way it looked before.

I had already written this failure down. Entry 8 of the runbook, drafted the day before I hit it:

> *Custom CSS is Pro and above; Custom JS is Enterprise-only. A theme whose layout depends on JS degrades hard when a plan changes, and trials expose Enterprise features to accounts that will not keep them. Advise CSS-only theming wherever possible.*

Which is why the generator emits no JavaScript and no webfonts, and why the tool lives on my own domain rather than depending on a plan tier to demonstrate itself.

The failures I find interesting are the quiet ones, where the product is behaving exactly as designed and the customer's mental model is the only broken thing. There is no stack trace for that. You get there by reproducing it, noticing what isn't in the DOM, and knowing which layer is entitled to lie to you.

The runbook is ten entries, sorted by how quiet each failure is, because quiet failures generate the longest tickets. If any of it is useful to your team, take it. That's what the licence is for.

## Why ReadMe

**Your product is aimed at something I already believe.** Two decades of watching the same question arrive a third time and thinking this should have been a document. ReadMe exists so developers don't have to open a ticket. That isn't a feature to me, it's a position I already hold.

**The support work here is unusually interesting.** Most enterprise support means diagnosing your own product. Support at ReadMe means diagnosing the seam between a customer's OpenAPI spec, their repo, their CI pipeline, their identity provider, and your platform. The fault is usually in something that isn't yours. That's what I did for twenty years across 30+ external healthcare systems, where the symptom appeared in our product and the cause lived in someone else's.

**Your technical skills list includes leveraging AI tools in debugging workflows, with judgment and verification.** I've worked that way about four years and have generally had to explain it. The fifteen years of doing it unaided before that are what makes it work, because the skill is knowing when the answer is wrong. I also led a 30-person technical team onto those tools, which is a different skill from using them well yourself.

## How I work

**I own issues to closure.** Not "escalated, awaiting response." Owned and communicated until the customer has an answer. For twenty years I was the named technical contact enterprise clients reached for first, on a team that held 95% retention.

**I look across cases, not just within them.** The pattern is worth more than the ticket. I built the operational reporting that turned recurring issues into something Product and Engineering could actually prioritise, with impact data attached so it competed properly against everything else on the roadmap.

**The documentation habit isn't generosity.** I'm neurodivergent, and I build external structure because I need it. Everyone else benefiting is the second-order effect. I co-led Phree & Able, my last employer's ERG for visible and invisible disabilities. I mention it because it's load-bearing in how I work rather than incidental to it, and because a page about who I am that left it out would be a slightly edited version of the answer.

**Metrics I think in:** time to first response, time to resolution, escalation quality, deflection, and honest adoption of whatever you built to help.

## Where I'm strong, and where I'm not

Resetting expectations honestly is a support skill, and your posting asks for it, so:

**Strong:** APIs and API debugging (Postman, Bruno, cURL, Chrome DevTools, HAR analysis), authentication flows including OAuth, SAML and SSO, log analysis, SQL, CLI environments, Git, Markdown, technical writing, and enterprise escalation and executive communication.

**Current, day to day:** Next.js and React, TypeScript, and the npm ecosystem. I'm a founding engineer on a production application built in that stack. My authorship there is AI-assisted. My ability to read, debug and modify it is not.

**Where I'd be learning:** your product surface, and the implementation patterns your enterprise customers actually run into. Weeks rather than months, but real.

Thanks for reading this far. I enjoyed building it, which whatever you decide made the day worth it.

Jonathan Loor
[linkedin.com/in/jonathanloor](https://linkedin.com/in/jonathanloor) · forhire@jonathanloor.com

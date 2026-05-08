# Panel Responses - Baseline Public Standing Review

**Review date:** 2026-05-08
**Review label:** baseline after root/staging story-alignment promotion

These responses summarize the fixed prompts from
`docs/public-face/reviews/templates/panel-prompts.md`.

## Search / AI Summary Pass

1. **What is iHomeNerd in one sentence?**
   iHomeNerd appears to be an early public preview of a local/private AI home
   brain, but the live root page still frames it as smart-home intelligence
   built around Scout, Brain, and Journal.

2. **Who is it for?**
   Technically comfortable home users, local AI experimenters, and homelab
   users who want private AI capabilities on their own machines.

3. **What can users do today?**
   The README and staging page imply early adopters can run a repo-based Docker
   path on spare Linux or SSH-reachable hardware and use local chat,
   translation, summarization, and related services.

4. **What appears unfinished, preview-only, or unclear?**
   Root deployment, guided VM, live image, licensing, GitHub metadata, and
   polished onboarding remain unfinished or unclear.

5. **Is the project open source, open core, public-but-unlicensed, or unclear?**
   Public-but-unlicensed is the safest reading because GitHub reports no
   license and the README no longer claims `Open core`.

6. **What evidence supports your view?**
   README quick start, Docker compose files, staging copy, public GitHub
   metadata, and the lack of license/releases.

7. **What might you be misunderstanding?**
   The live root page may be stale relative to the promoted repo source.

## Cold Visitor Pass

1. **What problem does this solve?**
   It helps a home run private AI services locally for documents, voice,
   translation, network awareness, and app workflows.

2. **What would you click next?**
   From the root page, `Visit staging preview`; from GitHub, `README.md` and
   Docker setup.

3. **What would stop you from trying it?**
   No license, no release, no polished installer, no root/staging consistency,
   and warnings that Docker is still repo-based.

4. **What phrase made the product clearest?**
   The promoted README opener: `A local AI home brain for private document
   chat, voice, translation, network awareness, and agent workflows`.

5. **What phrase confused you most?**
   The live root phrase `smart-home intelligence platform` because it sounds
   narrower and more device/product focused than the local AI brain story.

## Developer Trust Pass

1. **Can you tell what the repo does?**
   Yes, after reading the README. The repo is a local AI home brain with
   backend, frontend, landing, mobile, VM, Docker, and docs surfaces.

2. **Can you tell how to run it?**
   Mostly yes. README has local Python and Docker compose instructions, with
   caveats that the Docker path is repo-based.

3. **Can you tell whether reuse is legally allowed?**
   No. There is no top-level license and GitHub reports `license: null`.

4. **Do repo metadata, screenshots, releases, topics, and docs inspire trust?**
   Docs and recent push activity help. Missing description, homepage, topics,
   releases, screenshots, and license hurt.

5. **What one repo change would most increase confidence?**
   Add an explicit license decision and repo metadata, then add a screenshot or
   short demo preview.

## Product Fit Pass

1. **Which use case sounds most real today?**
   Local document/chat/translation services on a spare Linux or SSH-reachable
   machine.

2. **Which use case sounds aspirational?**
   Guided VM, live image, polished root-domain launch, and broader local home
   automation workflows.

3. **Does the local/private data promise feel credible?**
   Mostly yes in the repo story, because localhost, Docker, and local hardware
   are emphasized. It is less clear from the live root page.

4. **Do you understand the install or trial path?**
   Early-adopter path is understandable. Mainstream path is still "wait for VM
   or live image."

5. **Would you try it? Why or why not?**
   A homelab user might try it in a sandbox. A normal home user should wait for
   a VM, live image, release, and clearer public trust signals.

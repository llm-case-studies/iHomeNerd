# Input Snapshot - Baseline Public Standing Review

**Review date:** 2026-05-08
**Review label:** baseline after root/staging story-alignment promotion
**Compared to:** 2026-05-07 external AI impressions and public surface audit

## Source State Reviewed

### Live root page

Fetched on 2026-05-08 from `https://ihomenerd.com`.

Observed signals:

- title: `iHomeNerd - Smart Home Intelligence`
- hero: `Your home, understood.`
- category frame: smart-home intelligence platform
- modules: `Scout`, `Brain`, `Journal`
- CTA: `Visit staging preview`
- launch note: `Free to use. Production launch coming soon.`

Interpretation:

- still reads like a smart-home product/data guidance splash page
- still differs from the repo-controlled local AI home brain story
- still sends cold visitors to staging rather than explaining the product fully

### Live staging page

Fetched on 2026-05-08 from `https://staging.ihomenerd.com`.

Observed signals:

- title: `iHomeNerd - Public Local AI, Private Data at Home`
- metadata still leads with `Public preview page`
- noscript still includes `This staging URL is the current public preview page`
- noscript still includes `canonical summary of the current trial paths`

Interpretation:

- live staging has not yet received the promoted `main` landing build
- it is closer to the intended category than the root page
- it still over-signals staging/preview compared with the promoted source

### Promoted repo source

Reviewed from promoted `main` after:

- `b7637969221f5c190fa711ae3888c0e77fdb6445`
- `24aa4ada7de452b21b6ebbb6dfa3de8adbf6bf5d`
- `f61ca18` promotion bookkeeping

Observed signals:

- README opener now says iHomeNerd is a local AI home brain for private
  document chat, voice, translation, network awareness, and agent workflows
- README no longer claims `Open core`
- landing metadata now leads with `Local AI Home Brain for Private Data`
- landing source removes the highest-risk repeated phrases called out by the
  validation audit

Interpretation:

- repo-controlled story is materially improved
- public deployment has not caught up yet

### Public GitHub metadata

Fetched on 2026-05-08 from GitHub API for `llm-case-studies/iHomeNerd`.

Observed metadata:

- description: null
- homepage: null
- topics: none
- license: null
- stars: 0
- forks: 0
- watchers: 0
- discussions: disabled
- open issues count: 1
- default branch: `main`
- pushed_at: 2026-05-08

Interpretation:

- activity is visible through push time, but repo trust metadata is weak
- license/legal clarity remains the biggest GitHub trust blocker

### Crawl basics

Fetched on 2026-05-08:

- `https://ihomenerd.com/robots.txt` returned 404
- `https://ihomenerd.com/sitemap.xml` returned 404

Interpretation:

- crawl/discoverability baseline remains incomplete

## Snapshot Conclusion

The promoted source has improved, but the live public surface has not caught
up. Cold outsiders still see the old root story first, then the older staging
preview wording, while developers who reach GitHub see a better README but weak
repo metadata and no license.

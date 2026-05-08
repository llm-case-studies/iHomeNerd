# Wrong-Inference Log

**Review date:** 2026-05-08
**Review label:** baseline after root/staging story-alignment promotion

| Inference | Source | Surface that caused it | Severity | Status | Sprint / action |
|---|---|---|---|---|---|
| iHomeNerd might be virtual home staging. | External AI summary from 2026-05-07 | Weak category anchoring and "staging" language | P0 | improved | Root/staging story alignment improved repo source; live deployment still needed. |
| iHomeNerd is mainly a Scout-Brain smart-home device guidance site. | Live root page review | `Smart Home Intelligence`, `Scout`, `Brain`, `Journal` root copy | P0 | open | Replace or redeploy root page with local AI home brain story. |
| The staging page is the product's private/internal admin surface. | External AI summary and cold visitor risk | Repeated `staging URL`, `public preview`, and `canonical summary` language on deployed staging page | P1 | improved | Source fixed in promoted main; deployed staging still stale. |
| The project is open source or open core. | External AI summary and old README wording | Old `Open core` claim, public GitHub repo, no license file | P0 | improved | README overclaim removed; license decision still required. |
| The repo may be abandoned or mostly hype. | Anonymous ChatGPT-style repo trust read | Thin public metadata, zero stars/forks, no releases, no topics, no screenshots | P1 | open | GitHub trust-surface cleanup. |
| A polished Docker Hub one-line image exists. | Early-adopter expectation | Docker language without enough caveat | P2 | improved | README and staging source explicitly say Docker is repo-based. |
| A normal home user should rely on it for critical home infrastructure today. | Over-reading the product promise | Broad home AI framing without release maturity context | P1 | accepted | Keep preview/current-path truthfulness visible after product value. |
| Search engines can crawl a complete canonical site. | SEO assumption | `robots.txt` and `sitemap.xml` return 404; staging canonical remains staging | P2 | open | SEO/discoverability baseline. |

## Severity Guide

- `P0`: changes the perceived product category or trust/legal status
- `P1`: blocks a likely visitor from trying the product
- `P2`: creates friction but does not block understanding
- `P3`: polish issue or minor ambiguity

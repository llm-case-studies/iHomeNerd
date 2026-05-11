# Validator Notes — Nginx Topology Inspector (Implementor Notes Validation)

**Agent:** validator
**Host:** iMac-Debian
**Date:** 2026-05-10
**Target repo:** ionos-4c8g-production
**Target branch:** feature/ionos-lab-foundation
**Scope:** Implementor notes only (docs, snapshots, templates). No mutation of production.

## Product Commit Under Test

- **Commit:** `4f05e0ca4641c0cb18093d99d99553ba9b586c50`
- **Branch:** `feature/ionos-lab-foundation`

## Validation Approach

Read-only audit of nginx topology documentation and config snapshots in the
production repo. Cross-referenced:

- `ARCHITECTURE.md` (topology diagram and descriptions)
- `DEPLOYMENT_PATTERNS.md` (deployment patterns)
- `ADDING_NEW_APP.md` (new app onboarding guide)
- `snapshots/current/nginx-config/` (production nginx config snapshot)
- `snapshots/current/nginx-config-staging/` (staging nginx config snapshot)
- `templates/nginx/` and `templates/nginx-staging/` (config templates)
- `templates/new-app/` (new app templates)

No nginx reloads, no key reads, no .env reads, no Cockpit plugin implementation.

---

## 1. ARCHITECTURE.md — Topology Diagram Accuracy

### Verdict: PASS (with minor notes)

**Production proxy routes documented vs snapshot configs:**

| Documented Route | Snapshot Config | Match |
|---|---|---|
| iLegalFlow.com → info_pages | `conf.d/ilegalflow.conf` | PASS |
| Crypto-Fakes.com → info_pages | `conf.d/crypto-fakes.conf` | PASS |
| VW.iLegalFlow.com → vaultwarden:80 | `conf.d/vaultwarden.conf` | PASS |
| api.pronunco.com → 127.0.0.1:8090 | `conf.d/pronunco-api.conf` | **NOTE** |
| on-my-watch.com → info_pages | `conf.d/on-my-watch.conf` | PASS |
| edge-kite.com → info_pages | `conf.d/edge-kite.conf` | PASS |
| umami.edge-kite.com → umami:3000 | `conf.d/umami.conf` | PASS |
| umami.on-my-watch.com → umami:3000 | `conf.d/umami-on-my-watch.conf` | PASS |
| umami.ilegalflow.com → umami:3000 | `conf.d/umami-ilegalflow.conf` | PASS |
| umami.pronunco.com → umami:3000 | `conf.d/umami-pronunco.conf` | PASS |
| staging.* → nginx-proxy-staging:8080 | `conf.d/staging-proxy.conf` | PASS |

**Note on api.pronunco.com:** ARCHITECTURE.md documents `127.0.0.1:8090` but the
actual config (`conf.d/pronunco-api.conf`) uses `host.docker.internal:3011`.
The diagram is stale — it reflects an earlier deployment. The snapshot config is
the current truth.

**Missing from diagram:** The snapshot contains additional domains not listed in
the ARCHITECTURE.md diagram:
- `ihomenerd.com` (`conf.d/ihomenerd.conf`)
- `iscamhunter.com` (`conf.d/iscamhunter.conf`)
- `pronunco.com` bare domain info page (`conf.d/pronunco.conf`)

**Staging proxy routes documented vs snapshot:**

| Documented Route | Snapshot Config | Match |
|---|---|---|
| staging.ilegalflow.com → /www/ilegalflow-staging/ | `staging-proxy.conf` (proxy_pass) | PASS |
| staging.pronunco.com → /www/pronunco-staging/ | `staging-proxy.conf` (proxy_pass) | PASS |

The staging domains listed in the diagram are a subset of what's in
`staging-proxy.conf`. The full list from the snapshot:
- staging.ilegalflow.com
- staging.on-my-watch.com
- staging.edge-kite.com
- staging.pronunco.com
- api-staging.pronunco.com
- staging.ihomenerd.com
- staging.iscamhunter.com

## 2. ARCHITECTURE.md — Container Table Accuracy

### Verdict: PASS (with minor notes)

**Production containers:**

| Documented | Snapshot Evidence | Match |
|---|---|---|
| nginx-proxy-prod (443) | `nginx.conf` + `conf.d/*.conf` | PASS |
| vaultwarden (80 internal) | `conf.d/vaultwarden.conf` → `vaultwarden:80` | PASS |
| umami (3000 internal) | `conf.d/umami*.conf` → `umami:3000` | PASS |
| umami-db (5432 internal) | Not in nginx configs (expected) | N/A |

**Staging containers:**

| Documented | Snapshot Evidence | Match |
|---|---|---|
| nginx-proxy-staging (8080) | `nginx-config-staging/nginx.conf` | PASS |
| pronunco-api-staging (8090) | `conf.d/pronunco-api-staging.conf` → `pronunco-api-staging:8090` | PASS |

## 3. Two-Proxy Architecture Rationale

### Verdict: PASS

The documentation correctly explains:
- SSL termination at prod nginx for both prod and staging domains
- Blast radius isolation (staging crash doesn't affect prod)
- Future portability (staging can move to separate VPS)

The `staging-proxy.conf` confirms this pattern: all staging server blocks use
`proxy_pass http://host.docker.internal:8080` to forward to the staging nginx.

## 4. DEPLOYMENT_PATTERNS.md — Pattern Consistency

### Verdict: PASS

The three patterns (A: Static, B: API, C: Static+API) are well-defined and
consistent with the actual configs:

- **Pattern A examples** (static only): `edge-kite.conf`, `on-my-watch.conf`,
  `pronunco.conf` — all serve from `root` directives with `try_files`.
- **Pattern B examples** (API only): `pronunco-api.conf`, `vaultwarden.conf` —
  all use `proxy_pass` to backend containers.
- **Pattern C examples** (static + API): `pronunco-staging.conf` serves static
  at `/` and proxies `/api/*` to `pronunco-api-staging:8090`.

The staging vs production separation is correctly documented:
- Prod nginx: port 443, SSL termination
- Staging nginx: port 8080, reached via prod proxy

## 5. ADDING_NEW_APP.md — Onboarding Guide Consistency

### Verdict: PASS

The step-by-step guide aligns with the actual repo structure:
- Templates in `templates/new-app/` match the documented nginx config templates
- The staging-proxy.conf addition pattern matches existing entries
- SSL cert paths in templates reference the correct directory conventions

**Minor note:** The guide references `/home/proxyuser/nginx-config/conf.d/` for
staging-proxy.conf additions, which is correct (staging-proxy.conf lives in the
prod nginx's conf.d, not the staging nginx's conf.d).

## 6. Snapshot Config — Internal Consistency

### Verdict: PASS

**Production nginx config (`snapshots/current/nginx-config/`):**
- `nginx.conf` includes `conf.d/*.conf` — correct
- 14 config files in `conf.d/`, all syntactically consistent
- Log paths reference `/var/www/NgNix-RP/nginx-logs/` — consistent across configs
- SSL cert paths reference `/etc/nginx/certs/` — consistent pattern

**Staging nginx config (`snapshots/current/nginx-config-staging/`):**
- `nginx.conf` includes `conf.d/*.conf` — correct
- 7 config files in `conf.d/`
- All listen on port 80 (SSL terminated upstream) — correct
- Log paths reference `/var/log/nginx/` — consistent

**Notable config observations:**
- `staging-proxy.conf` uses `host.docker.internal:8080` for all staging proxy
  targets — this is Docker Desktop convention; on the actual VPS this would need
  to resolve to the staging container's network address.
- `pronunco-api.conf` uses `host.docker.internal:3011` — same note applies.
- The `http2 on;` directive is deprecated in newer nginx versions (replaced by
  `http2 on;` in the `listen` directive), but works in nginx 1.24.

## 7. Template Consistency

### Verdict: PASS

| Template | Purpose | Consistency |
|---|---|---|
| `templates/nginx/nginx.conf.example` | Base nginx.conf | Matches snapshot structure |
| `templates/nginx-staging/conf.d/mbeacon-staging.conf.example` | Staging site config | Matches staging pattern |
| `templates/new-app/nginx-staging.conf.template` | New app staging config | Matches staging pattern |

Templates are consistent with the actual deployed configs.

## 8. Security Observations (Read-Only)

### Verdict: INFORMATIONAL

- SSL private key paths are referenced in configs but key contents are NOT in
  the repo (correct — keys should never be committed).
- No `.env` files or runtime secrets are present in the repo snapshots.
- The `RUNTIME_SECRETS_STANDARD.md` and `SECRETS_SYNC.md` documents correctly
  describe the secrets management approach.

## Summary

| Section | Verdict |
|---|---|
| ARCHITECTURE.md topology diagram | PASS (3 domains missing from diagram, 1 stale backend target) |
| ARCHITECTURE.md container table | PASS |
| Two-proxy rationale | PASS |
| DEPLOYMENT_PATTERNS.md | PASS |
| ADDING_NEW_APP.md | PASS |
| Snapshot internal consistency | PASS |
| Template consistency | PASS |
| Security (read-only) | INFORMATIONAL |

### Discrepancies Found

1. **ARCHITECTURE.md diagram is incomplete** — Missing `ihomenerd.com`,
   `iscamhunter.com`, and `pronunco.com` (bare domain info page) from the
   production routes list.

2. **ARCHITECTURE.md api.pronunco.com target is stale** — Documents
   `127.0.0.1:8090` but actual config uses `host.docker.internal:3011`.

3. **ARCHITECTURE.md staging routes are incomplete** — Only lists 2 staging
   domains but `staging-proxy.conf` has 7 server blocks.

These are documentation drift issues, not operational problems. The snapshot
configs are the authoritative source of truth.

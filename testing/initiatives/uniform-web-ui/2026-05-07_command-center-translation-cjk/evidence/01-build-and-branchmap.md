# Build and Branch Map Evidence

## Frontend Build

```
> ihomenerd-frontend@0.1.0 build
> vite build

vite v6.4.2 building for production...
✓ 2129 modules transformed.
../backend/app/static/index.html                   0.41 kB │ gzip:   0.28 kB
../backend/app/static/assets/index-CfxquHja.css   35.38 kB │ gzip:   6.82 kB
../backend/app/static/assets/index-Cx_OzpLy.js   671.85 kB │ gzip: 202.58 kB
✓ built in 4.65s
```

Result: **PASS** - 0 errors, 2129 modules transformed.

## Landing Build

```
> ihomenerd-landing@0.1.0 build
> vite build

vite v6.4.2 building for production...
✓ 1710 modules transformed.
dist/index.html                   4.37 kB │ gzip:   1.61 kB
dist/assets/index-ijNJNe0K.css   30.64 kB │ gzip:   6.17 kB
dist/assets/index-D3jq6cgS.js   419.10 kB │ gzip: 125.97 kB
✓ built in 3.67s
```

Result: **PASS** - 0 errors, 1710 modules transformed.

## Branch Map

Branch `feature/uniform-web-ui/command-center-translation-cjk` identified:
- `[feature] +2 ahead mb:06b4cfd mb-date:2026-05-07`
- `tip: dae6d30 (2026-05-07)`
- Validation branch `validation/uniform-web-ui/command-center-translation-cjk` exists and matches.

Result: **PASS** - correct branch structure, 2 commits ahead of origin/main.

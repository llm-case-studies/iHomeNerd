# iHomeNerd Mobile Repo Strategy

**Status:** kickoff draft  
**Date:** 2026-04-24

## 1. Decision

Keep native mobile work inside the main `iHomeNerd` repo for now.

## 2. Why

The mobile apps depend directly on:
- household trust and Home CA rules
- discovery behavior
- node-role inventory
- gateway control APIs
- onboarding and recovery copy

Those contracts are still moving quickly. Splitting into a separate
`iHomeNerd-Mobile` repo too early would create avoidable version drift.

## 3. What lives here

Inside this repo:
- native Android controller app
- native iOS controller app
- mobile UX docs
- pairing and trust protocol notes
- design prompts and handoff briefs

Outside this repo:
- vertical product apps like `PronunCo`
- separate product-specific native apps when their own domain and release cycle
  justify a split

## 4. When a split would make sense later

Split mobile into a separate repo only if several of these become true:
- a dedicated mobile team exists
- store releases move on an independent cadence
- the shared mobile SDK and contracts stabilize
- native assets and CI become materially heavy
- cross-product mobile concerns outgrow the current infra repo

## 5. Working rule

For now:
- one infra repo
- one source of truth for mobile contracts
- separate product repos for product apps

That is the lowest-friction setup while iHomeNerd mobile is still forming.

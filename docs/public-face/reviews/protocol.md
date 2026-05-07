# Public Standing Review Protocol

**Date created:** 2026-05-07
**Purpose:** measure whether public-face improvements make iHomeNerd clearer,
more trustworthy, and easier to try.

## What This Measures

This protocol measures public interpretation, not internal intent.

Primary question:

> What does a cold outsider infer from the public surface?

Secondary question:

> Did the latest sprint reduce wrong inferences and increase confidence?

## Inputs To Capture

For every review, save or summarize:

- root page: `https://ihomenerd.com`
- staging page: `https://staging.ihomenerd.com`
- repository README
- public GitHub metadata: description, homepage, topics, license, stars/forks,
  releases, issues/discussions if visible
- page metadata: title, description, canonical URL, Open Graph URL/image
- crawl basics: `robots.txt`, `sitemap.xml`
- screenshots of root, staging, and GitHub top-of-page if practical
- AI/search summaries from fixed prompts

Use dates. Public surfaces change quickly, and old observations should not
silently become current claims.

## Panel Composition

Use the same panel shape each time:

- one search-oriented pass: what Google/search snippets or AI overview infer
- one cold-reader pass: what a non-insider human or AI infers from root + README
- one repo-trust pass: what a developer infers from GitHub metadata + README
- one product-fit pass: what a likely home/local-AI user thinks they can do

The panel can be human, AI, or mixed. The important rule is consistency: use
the same prompts and scoring rubric for before/after comparisons.

## Fixed Questions

Each panelist should answer:

1. What is iHomeNerd in one sentence?
2. Who is it for?
3. What can a user do with it today?
4. What is preview or not ready yet?
5. Is it open source, open core, public-but-unlicensed, or unclear?
6. What page or repo signal made you trust it more?
7. What page or repo signal made you trust it less?
8. What one thing would most increase your confidence?
9. Would you try it today? Why or why not?
10. What did you infer that might be wrong?

## Score Dimensions

Score each dimension 1-5:

- category clarity
- root/staging consistency
- "works today" clarity
- install/onboarding confidence
- trust/legal clarity
- repo credibility
- visual/professional polish
- AI/search-summary accuracy
- next-action clarity

Record short evidence next to every score. Scores without evidence are not
useful.

## Wrong-Inference Log

Maintain a list of wrong or weak inferences:

- inference
- source
- surface that caused it
- severity
- first seen date
- status: open, improved, resolved, or accepted
- sprint intended to address it

This is the most important artifact. A public-face sprint succeeds when high
severity wrong inferences move from open to improved or resolved.

## Before/After Comparison

After each improvement sprint, compare against the previous review:

- which scores improved?
- which wrong inferences disappeared?
- which wrong inferences persisted?
- did any new confusion appear?
- did the public story become more accurate, not just more flattering?

## Done Criteria For A Review

A review is complete when it has:

- dated input snapshot
- raw panel responses or summaries
- scorecard
- wrong-inference log
- synthesis with top 3 next public-face actions

## Guardrails

- Do not optimize for hype at the expense of truth.
- Do not hide preview status; place it after product value and current use.
- Do not claim open-source status until licensing is decided.
- Do not count internal docs as public onboarding unless a cold visitor can find
  and understand them.

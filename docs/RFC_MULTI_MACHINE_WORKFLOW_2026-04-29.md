# RFC: Multi-Machine Workflow For iHomeNerd

**Status:** discussion draft  
**Date:** 2026-04-29  
**Audience:** Android owner, iOS owner, Testing owner  
**Goal:** keep `main` as the source of truth while allowing active work to continue from Dell, Mac mini, and iMac without silent repo drift

---

## 1. Problem

We are no longer working from one machine or one agent.

Current reality:
- Dell is an active authoring machine
- Mac mini is an iOS-focused authoring machine and may host multiple agents
- iMac is now an Android build/deploy bench and can also host testing work
- agents do not all behave with the same discipline
- local repos can drift from `origin/main` without anyone noticing until push time

This RFC does **not** try to design a perfect enterprise Git process.  
It tries to define the smallest workflow that keeps:
- local experimentation possible
- `main` trustworthy
- recovery simple when one machine or agent goes wild

---

## 2. Proposed Principle

`origin/main` should be the shared source of truth.

Everything else is a buffer or staging area.

That means:
- no machine-local checkout should be treated as authoritative
- verified work should be committed and pushed promptly
- build hosts should pull from Git, not depend on ad-hoc rsync as the truth path

---

## 3. Proposed Branch Model

Use one long-lived working branch per machine:
- `wip/dell`
- `wip/mac-mini`
- `wip/imac`

Use `main` only for integrated, intentionally promoted work.

### Why this model

It matches how we are actually operating:
- Dell can drift
- Mac mini can drift
- iMac can drift
- multiple agents may touch the same machine over time

Machine branches give us:
- a clean checkpoint path
- a recovery path
- a place to inspect “what happened on this machine”

### What this model is not

It is **not**:
- one branch per agent
- one branch per session
- one branch per feature by default

Those may still be used occasionally for risky work, but they are not required for everyday motion.

---

## 4. Proposed Machine Roles

### 4.1 Dell

Primary role:
- operator shell
- integration thinking
- frontend / backend / Android runtime authoring

Default branch:
- `wip/dell`

### 4.2 Mac mini

Primary role:
- iOS-native development
- iPhone runtime work
- Apple-specific trust / packaging / signing flows

Default branch:
- `wip/mac-mini`

Constraint:
- Mac mini is space-constrained and should not become the general-purpose testing sandbox

### 4.3 iMac

Primary role:
- Android build and deploy bench
- testing work clone / test harness host
- general mobile verification bench

Default branch:
- `wip/imac` only if authoring is done there

Important nuance:
- iMac may build Android work originating from `wip/dell`
- build host and source branch are different concepts

### 4.4 MSI / Linux-heavy nodes

Primary role:
- heavier local model/runtime work
- Linux-friendly test execution
- broader non-Apple automation

No new Git policy is proposed here yet, but Linux is a valid place for most non-iOS tests.

---

## 5. Build Rule

Separate `source branch` from `build host`.

Examples:
- Android feature authored on Dell:
  - source branch: `wip/dell`
  - build host: iMac
- iOS feature authored on Mac mini:
  - source branch: `wip/mac-mini`
  - build host: Mac mini

Device validation reports should record:
- branch
- commit
- build host
- target device

Example:
- `M-E-21 tested from wip/dell @ <commit> using iMac build host`
- `iP12PM tested from wip/mac-mini @ <commit> using Mac mini build host`

---

## 6. Testing Rule

Tests should run against the branch and commit being validated.

### Proposed split

#### iOS owner
- keeps Mac mini focused on Apple-native work
- owns iOS-specific runtime and trust verification

#### Android owner
- owns Android device builds and Android-hosted runtime validation
- uses iMac as the preferred Android bench

#### Testing owner
- owns reusable test harnesses, fixtures, and contract tests
- should avoid sharing the same active working tree as iOS authoring on the Mac mini

### Testing host recommendation

General tests do **not** need to live on the Mac mini.

Good homes:
- iMac
- Linux nodes

Mac-only tests:
- Xcode/iOS build
- iOS Simulator
- Safari/WebKit-specific flows
- Apple trust-install flows

Therefore the current recommendation is:
- move general testing work off the main Mac mini checkout
- prefer iMac or Linux for non-Apple tests

---

## 7. Promotion Flow

Proposed day-to-day flow:

1. Work on the machine’s `wip/*` branch.
2. Commit and push meaningful checkpoints there.
3. Build/test from the appropriate host.
4. Promote to `main` only after the result is understood well enough.
5. Merge `main` back into each `wip/*` branch regularly.

This keeps `main` stable without blocking experimentation.

---

## 8. Recovery Model

If a machine branch goes wild:
- do **not** panic
- inspect that branch history
- cherry-pick or merge the good parts into `main`
- reset or repair the machine branch later

That is the main value of this RFC:
- mistakes stay localized
- history stays inspectable
- recovery stays cheap

---

## 9. Questions For Area Owners

### Android owner
- Is `iMac` the right long-term Android bench?
- Should Android builds default to pulling `wip/dell` unless explicitly overridden?

### iOS owner
- Is the Mac mini best kept as an iOS-only authoring/build machine?
- Should general testing be explicitly moved off the Mac mini main checkout?

### Testing owner
- Should the first dedicated test host be `iMac`, Linux, or both?
- Do we need a separate test clone on iMac immediately, or only when harness work becomes heavier?

---

## 10. Proposed Initial Adoption

If accepted, start with this minimal rollout:

1. Create:
   - `wip/dell`
   - `wip/mac-mini`
   - `wip/imac`
2. Keep `main` as the only promotion target.
3. Treat iMac as the preferred Android and general mobile-testing bench.
4. Keep Mac mini focused on iOS.
5. Require branch + commit identification in device test notes.

---

## 11. Non-Goals

This RFC does **not** currently define:
- strict branch protection policy
- PR-only workflow
- mandatory feature branches
- worktree policy
- agent-specific branch naming

Those can be added later if needed. The current goal is simply to stop silent drift and make Git the real shared truth.

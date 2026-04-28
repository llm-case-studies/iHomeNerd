# PronunCo Persistence Namespace Spec

**Date:** 2026-04-19
**Status:** architecture specification
**Audience:** iHomeNerd + PronunCo integration work
**Related:**
- `docs/PRODUCT_SPEC.md`
- `docs/ECOSYSTEM_INTEGRATION_2026-04-18.md`
- `backend/app/journal.py`
- `backend/app/sessions.py`
- `/media/alex/LargeStorage/Projects/PronunCo/docs/02_product/PRACTICE-PRIVACY-AND-TRANSFER-MODEL.md`

---

## 1. Purpose

PronunCo needs an **optional local persistence layer** inside iHomeNerd for cross-device continuity on user-controlled infrastructure.

This is **not** a request for iHomeNerd to become a generic cloud storage product.
It is a request for an **app-scoped, profile-aware persistence namespace** that allows PronunCo to store and retrieve a narrow set of learner artifacts on hardware the user controls.

The design goal is:

- keep PronunCo local-first
- avoid storing private learner history on PronunCo-operated servers
- allow cross-device continuity when the learner chooses a home/office node
- preserve privacy boundaries between apps and between people in the same household

---

## 2. Product Truth

`iHomeNerd is the local vault option. PronunCo remains the coach UI.`

PronunCo should still default to:

- on-device storage first
- temporary transfer rooms when the learner explicitly wants a handoff
- no silent upload of learner history to PronunCo-controlled systems

The iHomeNerd persistence namespace is an **opt-in BYO storage path** for users who want:

- device-to-device continuity
- family-local storage
- office-local storage
- stronger privacy than vendor cloud sync

---

## 3. Non-goals

This spec does **not** ask iHomeNerd to:

- become a generic Dropbox replacement
- expose one shared household bucket with no identities
- retain raw audio by default forever
- merge PronunCo data into the cross-domain home journal automatically
- infer educational meaning from arbitrary blobs
- replace PronunCo's own deck schema or app semantics

---

## 4. Core Requirements

### 4.1 App namespace isolation

PronunCo persistence must live in its own app namespace.

Requirement:

- PronunCo data is separate from TelPro-Bro, iMedisys, tax, docs RAG, and all other app/domain data

Suggested namespace root:

- `app = "pronunco"`

This aligns with the existing iHomeNerd product rule:

- per-app namespaces
- no long-term content storage unless explicitly configured

### 4.2 Profile isolation

The namespace must support **multiple human profiles** on the same node.

Requirement:

- household members cannot silently share one practice history
- one learner's weak spots, deck choices, tutor notes, and topic history must not leak into another learner's profile

Minimum profile concept:

- `profileId`
- `displayName`
- `createdAt`
- `updatedAt`
- `locked` or `accessMode`
- optional `pinRequired`

PronunCo should always operate inside:

- `app namespace`
- `profile namespace`

### 4.3 Explicit persistence

Long-term PronunCo persistence in iHomeNerd must be **explicitly enabled**.

Requirement:

- disabled by default on a fresh iHomeNerd install
- configurable per app
- configurable per profile
- visible in UI / settings

### 4.4 Typed resources, not arbitrary blobs

PronunCo should sync typed resources with predictable schemas.

Do not start with a free-form file bucket.

---

## 5. Resource Classes

### 5.1 Required resources for first useful version

#### A. Profile settings

Examples:

- preferred languages
- selected scoring strictness
- discovery/suggestion cooldown state
- preferred storage mode metadata

#### B. Deck library state

Examples:

- learner-owned custom decks
- imported deck metadata
- deck membership in local folders/groups
- per-deck last-updated metadata

Important note:

- official shared content can still come from GitHub or bundled samples
- iHomeNerd storage is for the learner's local working library and state, not the main editorial source of truth

#### C. Practice journal

Examples:

- per-deck attempt history
- line-level attempts
- recent browser/coach/Azure score summaries
- transcripts where retained by the learner

This maps naturally to PronunCo's current local `practice-history.ts` model.

#### D. Weak spot aggregates

Examples:

- repeated weak words
- repeated weak phonemes
- line families that keep failing
- future sound/pattern aggregates
- future situation-level aggregates

#### E. Tutor notes / handoff notes

Examples:

- generated tutor summary
- learner-written questions for the tutor
- note packets attached to a deck or clinic

#### F. Topics / groups / class links

Examples:

- local topic grouping
- learner-defined collections
- future class membership references
- future tutor relationship references

### 5.2 Optional later resources

#### G. Saved recordings

Only later, and only opt-in.

Default rule:

- raw audio should not be stored persistently unless the user turned that on deliberately

#### H. Dialogue session history

Only if users explicitly want persistence.

Default rule:

- bounded dialogue sessions may remain transient unless marked for save

---

## 6. Privacy Rules

### Rule 1: PronunCo remains local-first

If iHomeNerd is absent, PronunCo still works with on-device storage.

### Rule 2: No silent promotion from transient to durable

A short-lived dialogue session or temporary practice attempt should not become durable node history unless the app or user intentionally saves it.

### Rule 3: No cross-profile bleed

Recommendations, weak spots, tutor notes, and deck history must be scoped to one profile.

### Rule 4: No raw-audio default retention

Audio retention must be a separate switch, not an implied side effect of sync.

### Rule 5: Minimize sensitive topic leakage

Deck choice, topic choice, and weak spots may be sensitive. Treat them as private profile data.

---

## 7. Data Model Direction

The storage layer should support versioned resources with metadata for conflict handling.

Recommended common metadata on every resource:

- `id`
- `app`
- `profileId`
- `resourceType`
- `version`
- `updatedAt`
- `createdAt`
- `sourceDeviceId`
- `deletedAt` (optional tombstone)
- `syncRevision` or equivalent monotonic change token

Suggested top-level resource types:

- `pronunco.profile_settings`
- `pronunco.deck_state`
- `pronunco.practice_attempt`
- `pronunco.weak_spot_summary`
- `pronunco.tutor_note`
- `pronunco.topic_group`
- later: `pronunco.recording_ref`
- later: `pronunco.saved_dialogue`

---

## 8. API Shape

### 8.1 Design approach

Use a small PronunCo-specific API surface first.

Do not force PronunCo to speak a generic object store before the use cases are clear.

Base path:

- `/v1/pronunco`

### 8.2 Minimum endpoints

#### Profiles

- `GET /v1/pronunco/profiles`
- `POST /v1/pronunco/profiles`
- `GET /v1/pronunco/profiles/{profileId}`
- `PATCH /v1/pronunco/profiles/{profileId}`

#### Sync status

- `GET /v1/pronunco/profiles/{profileId}/sync/status`

Returns:

- whether persistence is enabled
- available resource classes
- latest revision token per resource class
- storage limits / policy hints if any

#### Deck state

- `GET /v1/pronunco/profiles/{profileId}/decks`
- `PUT /v1/pronunco/profiles/{profileId}/decks/{deckId}`
- `DELETE /v1/pronunco/profiles/{profileId}/decks/{deckId}`

#### Practice journal

- `GET /v1/pronunco/profiles/{profileId}/practice?deckId=...&since=...`
- `POST /v1/pronunco/profiles/{profileId}/practice/append`

#### Weak spots

- `GET /v1/pronunco/profiles/{profileId}/weak-spots`
- `PUT /v1/pronunco/profiles/{profileId}/weak-spots/{scopeId}`

#### Tutor notes

- `GET /v1/pronunco/profiles/{profileId}/tutor-notes`
- `PUT /v1/pronunco/profiles/{profileId}/tutor-notes/{noteId}`
- `DELETE /v1/pronunco/profiles/{profileId}/tutor-notes/{noteId}`

#### Topics / groups

- `GET /v1/pronunco/profiles/{profileId}/groups`
- `PUT /v1/pronunco/profiles/{profileId}/groups/{groupId}`
- `DELETE /v1/pronunco/profiles/{profileId}/groups/{groupId}`

### 8.3 Optional generic endpoint later

Only after the typed path stabilizes:

- `GET /v1/pronunco/profiles/{profileId}/resources/{resourceType}`
- `PUT /v1/pronunco/profiles/{profileId}/resources/{resourceType}/{id}`

That should be phase 2, not phase 1.

---

## 9. Conflict Policy

PronunCo uses multiple devices. Conflicts are expected.

First version can be pragmatic:

### Acceptable v1 policy

- last-write-wins for small mutable objects
- append-only for attempt history
- id-based replace for deck state
- explicit merge later for complex resources

Recommended by resource class:

- `practice_attempt`: append-only
- `weak_spot_summary`: recomputable aggregate, last-write-wins acceptable initially
- `deck_state`: last-write-wins with `updatedAt`
- `tutor_note`: last-write-wins in v1, manual merge later if needed
- `topic_group`: last-write-wins in v1

### Required metadata

Each write should include:

- `updatedAt`
- `sourceDeviceId`
- `baseRevision` when available

If a write is rejected because of conflict, return enough metadata for the client to retry or reconcile.

---

## 10. Storage Backend Expectations

This spec does **not** require a specific backend implementation yet.

Possible implementation path:

- SQLite tables under `~/.ihomenerd/`
- per-app, per-profile logical partitioning
- optional JSON payload columns plus indexed metadata columns

What matters first:

- stable contract
- profile scoping
- durability
- basic conflict handling
- inspectable local ownership

---

## 11. Relationship to Existing iHomeNerd Systems

### 11.1 Sessions

Existing `sessions.py` is transient and should remain transient.

Do not overload it as durable PronunCo sync storage.

### 11.2 Home journal

Existing `journal.py` is a useful precedent for local persistence, but it serves a different purpose:

- journal = solved-problem memory for the node
- PronunCo persistence namespace = app/profile data continuity

Do not automatically dump learner practice history into the general home journal.

A narrow bridge may exist later for explicitly derived insights, but it should not be the default.

### 11.3 Capabilities

When this feature exists, capability reporting should expose it explicitly.

Suggested capability names:

- `pronunco_profiles`
- `pronunco_persistence`
- `pronunco_sync`

Do not silently imply persistence from the existence of sessions or the general journal.

---

## 12. Security Model

### Localhost mode

- easiest first deployment
- one user or one household machine
- still profile-aware

### LAN mode

- requires pairing and trusted-host flow
- writes must be scoped to the chosen profile
- PronunCo should never blindly write to a LAN node without clear connection state

### Optional later hardening

- per-profile local PIN
- encrypted-at-rest profile payloads
- explicit device approval list

---

## 13. Suggested First Implementation Slice

The fastest useful slice is:

1. add PronunCo profile model
2. add persistence enable/disable flag
3. add append-only practice journal endpoint
4. add weak-spot summary read/write
5. add learner deck-state read/write
6. report capability via `/capabilities`

That is enough to support:

- cross-device score history
- tutor-note continuity
- recommendation state continuity
- household profile separation

without overbuilding a general storage layer.

---

## 14. Open Questions

1. Should profile identity be local-only names first, or should it support stronger auth immediately?
2. Should PronunCo store full attempt history on the node, or summarize/compact older attempts locally before sync?
3. Should saved recordings be in scope for the first PronunCo persistence slice, or deferred entirely?
4. Should topic groups and class links live in the same namespace from day one, or wait until teacher/class flows stabilize?
5. Should the node expose one sync revision stream or per-resource revision streams?

---

## 15. Working Rule

Use this sentence to keep the implementation honest:

> iHomeNerd should provide PronunCo with a profile-aware local persistence namespace, not a vague storage bucket and not a hidden cloud clone.


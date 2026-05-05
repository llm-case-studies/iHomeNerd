# Feedback: Client Surface Boundary Review (Round 1)

## Reviewer

- Name / model: glm-5.1
- Date: 2026-05-04

## High-level stance

The boundary problem is real and the 3-layer model is workable as a first cut, but it has a gap: it treats `adapter/plugin` as a single catch-all when there are actually two distinct sub-layers worth separating:

1. **Capability adapters** — thin transforms that bridge a core primitive to a domain shape (e.g., `normalize_pinyin` bridges `transcribe-audio` to the phonetic comparison domain). These are stateless, deterministic, and narrow.
2. **Workflow plugins** — orchestration-level logic that chains multiple core primitives + adapters into a session-shaped flow (e.g., `generate_drill` chains extraction + comparison + synthesis into a pedagogical loop). These are stateful, opinionated, and wider.

Conflating these is the biggest hidden assumption in the current framing. A pinyin normalizer is not the same kind of thing as a drill generator, even though neither belongs in core.

The other concern: the `app-owned` layer is under-specified. It is described by negation (things that should not be in iHN) rather than by what contract the app actually holds with iHN. Without defining that contract, the boundary between `adapter/plugin` and `app-owned` will stay fuzzy.

## Route and capability review

| Item | Classification | Reason |
|---|---|---|
| `/health` | core | Product-defining control-plane query; meaningful with zero client apps |
| `/discover` | core | Node identity and capability advertisement; household-level primitive |
| `/capabilities` | core | Natural companion to `/discover`; the "what can you do" answer |
| `/sessions` | core | Session lifecycle is shared substrate across every client; not app-specific |
| `/system/stats` | core | Household health and resource view; independent of any app |
| `/setup/*` | core | Trust and onboarding is the iHN product entry point |
| `/v1/chat` | core | General-purpose completion; stands on its own as an AI brain route |
| `/v1/translate` | core | Language translation is a general capability, not tied to any one app |
| `/v1/transcribe-audio` | core | ASR is shared infrastructure across PronunCo, TelPro-Bro, On-My-Watch, ACTCLI |
| `/v1/synthesize-speech` | core | TTS is shared infrastructure; same reasoning as ASR |
| `/v1/voices` | core | Voice inventory is a natural companion to TTS; product-level concern |
| `/v1/models` | core | Model inventory and selection is control-plane; not domain-specific |
| `compare_pinyin` | adapter (capability adapter) | Deterministic phonetic comparison; bridges ASR output to a domain shape; useful beyond PronunCo but narrow in scope |
| `normalize_pinyin` | adapter (capability adapter) | Pure input normalization; stateless helper; belongs in a language/phonetics adapter pack, not in top-level product surface |
| `extract_lesson_items` | adapter (workflow plugin) | Chains extraction + parsing into a pedagogical session shape; opinionated about what a "lesson item" is; PronunCo-adjacent semantics leak here |
| `generate_drill` | app-owned | Deeply opinionated about drill pedagogy; only makes sense inside PronunCo or a language-app context; should not be an iHN route at any level |
| `explain_score` | adapter (workflow plugin) | Score explanation logic sits between raw scoring and app presentation; could be shared across PronunCo + TelPro-Bro, but the score semantics differ enough that this is a "shared plugin with per-app config" case |
| `chat_persona` | adapter (workflow plugin) | Persona shaping is session-level orchestration; not a core primitive; belongs in a dialogue/session-config plugin namespace |

## Leakage and confusion

**Most leaked app/domain detail:** `generate_drill` and `extract_lesson_items`. These carry PronunCo's lesson model into what could become iHN route surface. The word "lesson" alone is a category mistake — iHN does not have lessons; PronunCo does.

**Helpers that look more "product-level" than they are:** `explain_score`. It sounds general, but "score" is ambiguous. PronunCo means pronunciation accuracy; TelPro-Bro means delivery quality; iMedisys means coverage gap score. The route name hides that this is really N different domain-specific explanation functions with a shared prompt pattern. It should either be split into per-domain namespaced adapters or remain a shared pattern that each app instantiates differently — not a single top-level route.

**Names that should be changed, namespaced, or hidden:**

- `chat_persona` → hide or namespace as `/plugins/dialogue/persona-config`. The word "persona" invites scope creep.
- `normalize_pinyin` → `/adapters/lang/pinyin/normalize` or similar. Makes the adapter layer explicit.
- `compare_pinyin` → `/adapters/lang/pinyin/compare`. Same reasoning.
- `extract_lesson_items` → should not exist as an iHN route at all. If PronunCo needs it, PronunCo should own it. A more general `extract_structured_items` could live in an adapter if multiple apps need structured extraction from learning material — but "lesson" is the wrong frame.

## Minimal contract for client apps

The smallest stable public iHN surface a client app needs:

1. **Identity and control plane:** `/health`, `/discover`, `/capabilities`, `/sessions`, `/setup/*`, `/system/stats`
2. **General AI capabilities:** `/v1/chat`, `/v1/translate`, `/v1/models`
3. **Voice pipeline:** `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`
4. **Document operations:** whatever docs/RAG routes exist (not enumerated in the current list but clearly needed by 6+ clients)

That is roughly 12-15 routes. Everything else should be opt-in: loaded via adapter packs or owned by the app.

Apps should be expected to own themselves:

- Any pedagogical logic (drill design, lesson progression, score display)
- Any domain-specific workflow orchestration (investigation flows, tax interview flows, coaching loops)
- Any presentation and UX choices
- Session-level opinionated prompts and personas (apps should send these as parameters to core chat/dialogue, not expect iHN to curate personas as product routes)

## Recommendations

### Top 3 conceptual changes

1. **Split the adapter/plugin layer into capability adapters vs. workflow plugins.** Capability adapters are stateless domain bridges (pinyin normalization, tax-form class detection). Workflow plugins are stateful session orchestrators (drill generation, coaching loop). This distinction changes how you version, namespace, and expose them — and it prevents workflow plugins from quietly inheriting the stability guarantees that should only apply to capability adapters.

2. **Define the app-iHN contract explicitly, not by negation.** The current framing says "app-owned = things that should not be in iHN." That is a negative definition. Instead, specify what a client app can assume: a stable set of core routes, an adapter pack registration mechanism, and a session lifecycle model. Everything outside that contract is app-owned by default. This makes the boundary a positive contract rather than a residual bucket.

3. **Treat `explain_score` as a pattern, not a route.** Score explanation recurs across PronunCo, TelPro-Bro, and potentially iMedisys and iLegalFlow. But the scoring semantics are domain-specific. Instead of one route, provide a shared prompt/explanation pattern that adapter packs instantiate with domain-specific scoring vocabulary. This avoids the false generalization of "score" while still capturing the shared structure.

### Top 3 cleanup actions for later coding/testing sprints

1. **Namespace existing PronunCo-origin helpers under `/adapters/lang/` or a plugin pack.** Move `compare_pinyin`, `normalize_pinyin` out of top-level route space. Verify that PronunCo still works after the move by adjusting its client code. This is the lowest-risk, highest-signal action.

2. **Audit `generate_drill` and `extract_lesson_items` for removal from iHN route surface.** Determine whether PronunCo can own these entirely, or whether a more general extraction primitive should replace `extract_lesson_items`. If the latter, design it as an adapter-level capability without the word "lesson."

3. **Write the minimal client-app contract as a route spec or OpenAPI fragment.** Enumerate only the core routes, their stability tier, and what a client app can rely on. This makes the boundary machine-checkable rather than philosophical.

## Disagreements and tensions worth preserving

**Tension 1: How thick should "core" be for simulation/roleplay?**

The seed brief asks whether simulation/roleplay should be a core primitive. I lean toward **no** — bounded dialogue sessions are already expressible via `/v1/chat` with session management. A separate "roleplay" or "simulation" primitive risks importing scenario semantics into core. But I am not fully confident here, because multiple apps (PronunCo, TelPro-Bro, ACTCLI, iLegalFlow) all want structured multi-turn dialogue with persona and scenario constraints. If every app re-implements session-scoped chat with persona injection, that is duplicated effort. The honest answer: I am unsure whether the right primitive is "core bounded-dialogue with adapter-supplied scenario config" or just "core chat + sessions, apps bring their own orchestration." This tension should not be resolved prematurely.

**Tension 2: `Edge-Kite` and `On-My-Watch` as clients vs. deployment variants.**

The portfolio list classifies On-My-Watch as `client` and Edge-Kite as `client / deployment`. I think this distinction is being drawn too late. Both are event-monitoring + triage products that want perception, extraction, and triage from iHN. The difference is mostly about whether a human is in the loop interactively (On-My-Watch) or whether the node acts autonomously at the edge (Edge-Kite). That is a deployment-model distinction, not a client-surface distinction. Both should consume the same core perception + triage primitives. I would argue Edge-Kite is closer to a deployment variant of the same client pattern than a sibling, and the current framing may be over-splitting here. But I am not certain — Edge-Kite's "pre-analyzer" role might genuinely need a different contract shape. Worth preserving the uncertainty.

**Tension 3: The risk of over-pruning core.**

The seed brief notes that if iHN becomes "only health/trust/chat/storage plumbing, it may stop being a useful AI brain product." I think this risk is real and underweighted in the current hypotheses. The current working model is conservative about what goes into core, which is the right bias for cleaning up spike residue. But the portfolio includes 6+ products that want perception + evaluation + explanation from iHN. If we push too much into adapters, we create a world where every client app must independently discover, load, and configure adapter packs before iHN is useful — and the "out of the box" iHN experience becomes anemic. The stable core should be thin, but it should not be hollow. The line between "thin" and "hollow" is the hardest judgment call in this review, and I do not think the current framing gives enough guidance for where that line is.

## Candidate follow-on sprint

**Sprint: Adapter pack contract design + PronunCo migration test**

Scope: Design the adapter pack registration, namespace, and loading contract. Then test it by migrating PronunCo's current helper surface (`compare_pinyin`, `normalize_pinyin`, `explain_score`, `chat_persona`) into a `lang` adapter pack. Verify that PronunCo's client-facing behavior is preserved. This would be a coding/testing sprint with a single real client as the canary, and it would produce the first concrete evidence for whether the adapter/plugin layer works in practice.

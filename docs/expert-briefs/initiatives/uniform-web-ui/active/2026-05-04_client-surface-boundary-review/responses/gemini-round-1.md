# Feedback Template: Client Surface Boundary Review

## Reviewer

- Name / model: Gemini 3.1 Pro (High)
- Date: 2026-05-04

## High-level stance

- What is your overall view of the current boundary problem?
  The current boundary problem is a classic result of "exploration mode" (spike mode) where capabilities were added wherever convenient to unblock prototypes. The resulting monolithic surface risks turning iHN into an unmaintainable, tightly-coupled grab-bag of domain-specific logic rather than a robust, general-purpose local AI node. Addressing this now is crucial before the API solidifies further.

- Is the proposed 3-layer model workable: `core iHN`, `adapter/plugin`, and `app-owned`?
  Yes, the 3-layer model is workable and maps well to established architectural patterns. However, there is a hidden assumption that `adapter/plugin` is a single unified layer. We must distinguish between *iHN-hosted plugins* (running on the node, extending the API) and *client-side adapters* (running in the app, shaping the data before it hits the network). Blurring this line will lead to deployment and versioning nightmares later.

## Route and capability review

- `/health`: `core` - Fundamental to any service architecture.
- `/discover`: `core` - Essential for clients to find and connect to nodes.
- `/capabilities`: `core` - Needed for clients to know what a specific hardware node supports.
- `/sessions`: `core` - Stateful interaction management is a generic primitive.
- `/system/stats`: `core` - Node health and resource monitoring.
- `/setup/*`: `core` - Node provisioning and trust establishment.
- `/v1/chat`: `core` - A fundamental general-purpose LLM primitive.
- `/v1/translate`: `core` - A general-purpose primitive.
- `/v1/transcribe-audio`: `core` - General-purpose ASR.
- `/v1/synthesize-speech`: `core` - General-purpose TTS.
- `/v1/voices`: `core` - Metadata for the TTS primitive.
- `/v1/models`: `core` - Discovery of available models on the node.
- `compare_pinyin`: `adapter/plugin` - Highly domain-specific to language learning. Does not belong in a general AI node's core API.
- `normalize_pinyin`: `adapter/plugin` - Same as above.
- `extract_lesson_items`: `app-owned` - "Lesson" is an app-specific concept. The semantic definition of what constitutes a lesson belongs strictly in the app or its dedicated adapter.
- `generate_drill`: `app-owned` - Drills are pedagogy. The logic of *what* drill to generate should live in the app, even if it uses the core `/v1/chat` to execute the generation.
- `explain_score`: `adapter/plugin` - If "score" implies a generic "compare A to B and explain the delta," maybe it's an adapter. But if it means "explain why the user got an 85 on this specific task," it's heavily app-owned.
- `chat_persona`: `unsure` - Tensions exist here. Is a persona just a system prompt injected by the client (app-owned)? Or is it a stateful, consistent entity managed by the node for cross-app consistency (e.g., a household assistant persona)? This needs clarification before being placed in `core`.

## Leakage and confusion

- Which current surface leaks too much app/domain detail into iHN?
  The PronunCo helpers (`compare_pinyin`, `normalize_pinyin`, `extract_lesson_items`) are the most glaring examples of leakage. They treat the general iHN node as a bespoke PronunCo backend.
- Which helpers look more "product-level" than they really are?
  `generate_drill` and `explain_score` sound like high-level product features. In reality, they are likely just specialized prompts wrapping a generic LLM call. This abstraction should happen in the client or a domain plugin, not the core API.
- Which names/routes should be changed, namespaced, or hidden?
  Any domain-specific route currently at the top level needs to be aggressively namespaced (e.g., `/ext/pronunco/v1/...` or `/plugins/language/...`) or moved entirely out of the iHN codebase. 

## Minimal contract for client apps

- What is the smallest stable public iHN surface a client app actually needs?
  A client app needs to discover the node (`/discover`), establish trust (`/setup`), verify health/capabilities (`/health`, `/capabilities`, `/models`), and execute stateless or lightly-stateful primitive AI tasks (`/v1/chat`, `/v1/transcribe-audio`, `/v1/synthesize-speech`). 
- What should apps be expected to own themselves?
  Apps must own all domain semantics, workflow state, pedagogy, UX, business logic, and the complex chaining of primitives. If an app needs a "drill," it crafts the prompt and calls `/v1/chat`. The iHN core should not know what a "drill" is.

## Recommendations

- Top 3 conceptual changes you would make:
  1. **Strictly define "Core Primitive"**: A core route must be domain-agnostic. It takes raw data (text, audio, image) and returns raw data, without understanding the business context (e.g., it transcribes audio, it doesn't "grade pronunciation").
  2. **Clarify the Plugin Boundary (The Disagreement/Tension)**: There is a tension around where plugins live. Do they execute on the iHN node or are "adapters" just client-side SDKs? We must define whether iHN supports an active server-side extension model. If yes, it needs a strict sandboxed namespace. If no, these helpers must move to client repositories.
  3. **Treat "Simulation/Roleplay" as an App Concept**: Reject the idea of adding roleplay/scenario primitives to the core. Core provides stateful chat; the app provides the scenario context, constraints, and evaluation.

- Top 3 cleanup actions that should become later coding/testing sprints:
  1. **Evict Domain Helpers**: Create a sprint to physically move `compare_pinyin`, `normalize_pinyin`, `extract_lesson_items`, etc., out of the core routing space.
  2. **Namespace Auditing & Enforcement**: Review all current routes and enforce a strict `/v1/` prefix for core primitives, and a completely separate namespace (e.g., `/plugin/...`) for everything else.
  3. **Core Contract Documentation**: Write a strict OpenAPI/contract definition for the *minimal* core surface and establish a CI/CD rule that no new top-level routes can be added without explicit architectural review.

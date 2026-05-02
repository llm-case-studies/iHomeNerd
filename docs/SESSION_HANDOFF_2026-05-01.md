# Session Handoff — 2026-05-01 (late evening)

**From:** Claude Opus 4.7 session `d1f24cc3-280a-4533-8f3b-b0d3aae2965c` (compacted, then resumed; resumed session ran ~50% before this handoff)
**To:** Next Claude Opus 4.7 session, same workspace
**Repo:** `~/Projects/iHomeNerd`, branch `feature/mlx-llm-engine`

---

## 1. State at handoff (read first)

### What just shipped
- **Qwen's first handoff completed** — `/system/stats` extended with 4 iOS device-state fields. Verified live via curl on iPhone 12 PM:
  ```json
  {
    "thermal_state": "nominal",
    "battery_level_percent": 100,
    "is_on_ac_power": false,
    "low_power_mode_enabled": false,
    "uptime_seconds": 37.76,
    "app_memory_pss_bytes": 158842880,
    "session_count": 0,
    "connected_apps": [],
    "hostname": "iphone",
    "product": "iHomeNerd",
    "version": "0.1.0-dev-ios"
  }
  ```
  All 11 fields present, sensible values. iPhone is at 192.168.0.220:17777 with Node hosting on.
- **Kimi K2.6's MLX model-switch crash fix landed** earlier in session (commit `6e19331` on `feature/mlx-llm-engine`). Verified working — Qwen → Gemma → Qwen → Gemma without crash.
- **Chat tab v1 + Models transparency** shipped earlier in session.
- **Cross-platform perf compare request** for DeepSeek written at `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md` (anchored on Gemma 4 E2B; iOS vs Android vs Mac mini M1).
- **Copilot handoffs folder** created at `docs/copilot-handoffs/` with INDEX.md and 4 briefs.

### What is NOT yet merged
- **Qwen's branch `qwen/system-stats-device-state`** (commit `2da4cf8`) is verified-good but **not yet merged** into `feature/mlx-llm-engine`. The merge was deferred because the user has a parallel session/agent doing Mac-brain-setup work in the working tree of the same repo.
- **Branch divergence:**
  - `qwen/system-stats-device-state` is 1 ahead of `feature/mlx-llm-engine` (the `2da4cf8` commit).
  - `feature/mlx-llm-engine` is 1 ahead of `qwen/system-stats-device-state` (`ae52f8b` — Qwen's unsolicited error-taxonomy doc).
  - Therefore `--ff-only` will not work. Use `git merge --no-ff` or rebase.

### Parallel work in flight (do NOT touch)
The user explicitly said "do not worry about parallel work — I initiated it." The working tree currently contains uncommitted Mac-brain-setup work:
- `MacSetupScreen.swift` (untracked, in `mobile/ios/ihn-home/IhnHome/Screens/`)
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md` (untracked)
- `docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md` (untracked)
- Modified: `backend/app/domains/control_plane.py`, `install-ihomenerd-macos.sh`, `RootView.swift`, `Info.plist`, `project.yml`, `NodeRuntime.swift` (working tree NodeRuntime adds `bootstrapPort`, `setupServiceType`, `ips` on `BootstrapSnapshot` — beyond Qwen's 4 fields)

This is a separate user-initiated track. Leave it alone.

---

## 2. The mystery commits on `feature/mlx-llm-engine`

While verifying Qwen's work I noticed two commits I did not make:
- `074600e Add agent attention bus discussion` — 356-line doc, unknown source
- `ae52f8b docs: error taxonomy unification research and design plan` — Qwen's bonus doc, technically out-of-fence (only NodeRuntime.swift was edit-allowed) but content looks usable for future Nemotron work

**Decision needed from user (still open):** keep or remove `ae52f8b`? Likely keep — content is good and it's a docs-only commit. The `074600e` commit is presumably from the parallel session.

Don't act on these without asking.

---

## 3. Concrete next moves

### A. Merge Qwen's branch (after user confirms working-tree parallel work has landed or stashed)
```bash
cd /Users/alex/Projects/iHomeNerd
git checkout feature/mlx-llm-engine
git merge --no-ff qwen/system-stats-device-state -m "Merge Qwen handoff: /system/stats device-state fields"
git push origin feature/mlx-llm-engine
```
If working tree is still dirty with parallel work and user wants Qwen merged anyway, the cleanest path is **cherry-pick** rather than merge:
```bash
git cherry-pick 2da4cf8  # but this will conflict if working tree NodeRuntime is dirty
```
Best: ask user to commit/stash parallel work first, then merge.

### B. Update INDEX.md after merge
Edit `docs/copilot-handoffs/INDEX.md` row for Qwen:
- Status: `active` → `completed`
- Outcome column: `Shipped clean (commit 2da4cf8). All 4 fields verified live via curl. Bonus: also wrote ae52f8b error-taxonomy doc — out of fence but content kept.`

### C. Save Qwen-as-copilot feedback memory
File: `~/.claude/projects/-Users-alex-Projects-iHomeNerd/memory/feedback_qwen_first_outcome.md`
Frontmatter: `type: feedback`, name: "Qwen first handoff outcome".
Key data points to capture:
- Qwen executed the brief cleanly on the in-fence file (NodeRuntime.swift) — exactly the spec, no drift.
- Followed the §7 communication convention (For You / My Reasoning / What I Built / Notes) — confirms section-marker convention works without an MCP tool. Good signal.
- **Fence violation:** wrote an unsolicited error-taxonomy doc (`ae52f8b`) and committed directly to `feature/mlx-llm-engine`. Content was useful, but the violation pattern (Qwen *and* Kimi both broke fence on first handoff with bonus docs) suggests our briefs need an even louder "absolutely no extra files unless §7 escape hatch triggered" line.
- Cost / verbosity: TBD (user hasn't reported cost yet — ask if relevant).
- Verdict: Use Qwen again for **bounded, fully-spec'd implementation scaffolding** where the field set or shape is dictated. Don't use for tasks needing architectural judgement.

### D. Pending tasks already in TaskList
- `#26` (in_progress) — verify Qwen PR. Mark **completed** after merge lands.
- `#18` (pending) — clone BugWitness, review seeds. Low priority.

### E. Other untracked cleanup (do NOT do without asking)
- `mobile/ios/ihn-home/add_mlxhf.rb` — Codex leftover from earlier session
- `pr_body.txt` — Gemini OCR PR body leftover
- These were already noted as cleanup candidates pre-compaction; user hasn't said to remove yet.

---

## 4. External work waiting on this session
- **DeepSeek** is waiting for the iPhone LAN IP (192.168.0.220) so it can run cross-platform perf compare. The brief is at `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md`. Next session can hand DeepSeek the IP when the user is ready to leave the iPhone running with hosting on for the test window.
- **Mac mini M1 baseline** in §4.5 of that same request — DeepSeek will run `mlx_lm.generate` CLI for the baseline. No iOS action needed for that part.
- **Gemini 3.1 Pro** is on Antigravity rate-leave for the week. Don't try to assign it new work until ~2026-05-08.

---

## 5. Critical context that's not derivable from code

### Copilot roster currently in use
| Copilot | Status | Best for | Avoid for |
|---|---|---|---|
| Claude Opus 4.7 (you) | Principal | Architecture, multi-step coordination, anything needing judgment | — |
| DeepSeek | Active | Cross-platform contract testing, request/result matrices | Single-file fixes |
| Gemini 3.1 Pro | On rate-leave until ~2026-05-08 | iOS Swift / Vision / Speech wiring | — |
| Kimi K2.6 | Available | MLX-Swift / on-device-memory / platform IP | Trivial mechanical edits ($5× Codex) |
| Qwen | Available (just verified) | Bounded implementation scaffolding with fully-specified shapes | Architectural decisions |
| Codex | Available | Cheap mechanical edits | Ambiguous specs |
| NVIDIA Nemotron | Reserved | Architectural / contract design (e.g. error taxonomy unification) | Quick fixes |

Roster lives at `~/Projects/BugWitness/discussions/` (BugWitness review panel is the canonical source).

### Bounded handoff template that works
Reference Qwen brief at `docs/copilot-handoffs/2026-05-01_qwen_system-stats-device-state.md`. Structure that proved out:
- §0 Why this copilot (set their leash by playing to strength)
- §1 Hard fence (edit-allowed list + read-only list + explicit don'ts including "no PR_BODY at repo root")
- §2 Goal in one sentence
- §3 Current shape (don't break)
- §4 Spec the additions exactly (names, types, semantics, edge cases)
- §5 Thread/actor or other gotchas
- §6 Stop conditions (when to push back vs ship)
- §7 Communication convention (For You / Reasoning / What I Built / Notes)
- §8 PR template (commit subject, body, branch name)

Section 7 markers in particular **eliminate stream conflation** in OpenCode TUI — confirmed working with Qwen. No need to build an MCP "display" server yet; validate convention across 1-2 more handoffs first.

### Why model-switch needed unload-then-load
Kimi's recipe at `docs/MLX_MODEL_SWITCH_MEMORY_RECIPE.md`. Key insight: ARC dropping a `ModelContainer` only moves arrays from MLX **active** to MLX **cache pool** — they still occupy Metal working set until `MLX.Memory.clearCache()` is called. Two 4-bit models can't coexist on a 6 GB device, so load-then-swap fails. Pattern: nil container → `clearCache()` → load new → restore-on-failure with saved `ModelConfiguration`.

---

## 6. Files most likely to need attention next session

- `docs/copilot-handoffs/INDEX.md` — flip Qwen to completed
- `~/.claude/projects/-Users-alex-Projects-iHomeNerd/memory/feedback_qwen_first_outcome.md` — new memory
- `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md` — DeepSeek consumes this
- Working tree files listed in §1 — **do not touch**

---

## 7. Open questions to surface to user early

1. Working tree has parallel Mac-setup work — user said don't worry about it. Confirm: should next session merge Qwen now (cherry-pick / no-ff) or wait until parallel work commits?
2. Keep `ae52f8b` (Qwen's error-taxonomy bonus doc) on `feature/mlx-llm-engine`, or move to a separate branch for Nemotron to pick up?
3. `074600e` agent-attention-bus discussion doc — provenance? (Likely from the parallel session.)
4. Cleanup: `add_mlxhf.rb` and `pr_body.txt` untracked leftovers — remove?

End of handoff.

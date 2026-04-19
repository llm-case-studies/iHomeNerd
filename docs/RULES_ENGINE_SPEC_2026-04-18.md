# Rules Engine Specification

**Date:** 2026-04-18
**Status:** Architecture Specification
**Component:** `backend/app/rules.py` (new)
**Data directory:** `~/.ihomenerd/rules/`

---

## 1. Purpose

A deterministic, JSON-driven rules engine for high-stakes decisions where LLM hallucination is unacceptable. The LLM explains outcomes in plain English but never computes them. The rules engine computes outcomes from structured facts and auditable rule definitions.

**Design principles:**
- Rules are data, not code — add/remove/modify without rebuild
- Hot-reload on file change — no restart needed
- Every outcome is traceable to a specific rule with cited authority
- Smart validation catches errors before users encounter them
- Open-source rule packs invite community contribution

---

## 2. Rule File Structure

### 2.1 Directory Layout

```
~/.ihomenerd/rules/
├── medicare/
│   ├── enrollment-windows.rules.json
│   ├── switching-penalties.rules.json
│   ├── medigap-guarantee.rules.json
│   └── state-overrides/
│       ├── NY.rules.json
│       ├── CT.rules.json
│       └── ...
├── tax/
│   ├── federal-brackets-2026.rules.json
│   ├── standard-deduction-2026.rules.json
│   └── state/
│       ├── NJ-2026.rules.json
│       └── ...
├── medical-coding/
│   ├── unspecified-code-denials.rules.json
│   └── payer-specific/
│       ├── aetna.rules.json
│       └── uhc.rules.json
└── travel-insurance/
    └── preexisting-waiver-windows.rules.json
```

Files use the `.rules.json` extension to distinguish them from other JSON data. Subdirectories organize by domain and scope. The engine recursively scans domain directories.

### 2.2 Rule File Format

```json
{
  "meta": {
    "id": "medicare.switching.ma-to-medigap",
    "version": "2026-01",
    "domain": "medicare",
    "title": "Medicare Advantage to Medigap Switching Penalties",
    "authority": "CMS Medicare & You 2026, pp. 61-63",
    "authority_url": "https://www.medicare.gov/publications/10050",
    "effective": "2026-01-01",
    "expires": "2026-12-31",
    "author": "alex",
    "reviewed": null,
    "tags": ["medicare", "medigap", "switching", "enrollment"]
  },

  "facts_schema": {
    "age":                    { "type": "integer",  "required": true },
    "state":                  { "type": "string",   "required": true },
    "has_original_medicare":  { "type": "boolean",  "required": true },
    "part_b_start_date":      { "type": "date",     "required": true },
    "current_plan_type":      { "type": "enum",     "values": ["MA", "Medigap", "none"], "required": true },
    "current_plan_start_date":{ "type": "date" },
    "preexisting_conditions": { "type": "string[]", "default": [] }
  },

  "rules": [
    {
      "id": "medigap-oep",
      "name": "Medigap Open Enrollment Period",
      "description": "6-month guaranteed-issue window from Part B effective date at age 65+",
      "when": {
        "all": [
          { "fact": "age", "op": ">=", "value": 65 },
          { "fact": "has_original_medicare", "op": "==", "value": true },
          { "fact": "part_b_start_date", "op": "within_months", "value": 6 }
        ]
      },
      "then": {
        "outcome": "guaranteed_issue",
        "severity": "info",
        "message": "You are in your Medigap Open Enrollment Period. Any insurer must sell you any Medigap policy at the best available rate, regardless of health status.",
        "deadline": {
          "compute": "part_b_start_date + 6 months",
          "label": "Medigap OEP closes",
          "lead_time_days": 180
        }
      }
    },
    {
      "id": "ma-to-medigap-after-oep",
      "name": "MA to Medigap after Open Enrollment",
      "description": "After OEP, switching from MA to Medigap loses guaranteed-issue rights in most states",
      "when": {
        "all": [
          { "fact": "current_plan_type", "op": "==", "value": "MA" },
          { "fact": "part_b_start_date", "op": "beyond_months", "value": 6 }
        ]
      },
      "then": {
        "outcome": "underwriting_required",
        "severity": "warning",
        "message": "Your Medigap Open Enrollment has expired. Insurers in most states can deny coverage or charge higher premiums based on pre-existing conditions.",
        "exceptions": [
          {
            "when": { "fact": "state", "op": "in", "value": ["NY", "CT", "MA", "ME", "VT", "WA"] },
            "override_outcome": "guaranteed_issue",
            "override_severity": "info",
            "override_message": "Your state requires guaranteed issue for Medigap year-round. You can switch without medical underwriting."
          }
        ]
      }
    },
    {
      "id": "ma-trial-right",
      "name": "Medicare Advantage Trial Right",
      "description": "12-month right to return to Medigap after switching to MA",
      "when": {
        "all": [
          { "fact": "current_plan_type", "op": "==", "value": "MA" },
          { "fact": "current_plan_start_date", "op": "within_months", "value": 12 }
        ]
      },
      "then": {
        "outcome": "trial_right_active",
        "severity": "info",
        "message": "You have a 12-month trial right. You can drop MA and return to your previous Medigap policy (or buy Plan A, B, C, F, or K/L) with guaranteed issue.",
        "deadline": {
          "compute": "current_plan_start_date + 12 months",
          "label": "MA Trial Right expires",
          "lead_time_days": 90
        }
      }
    }
  ]
}
```

### 2.3 Supported Types in facts_schema

| Type | JSON | Python | Notes |
|------|------|--------|-------|
| `integer` | number | int | |
| `float` | number | float | |
| `string` | string | str | |
| `boolean` | boolean | bool | |
| `date` | string (ISO 8601) | date | `"2026-10-15"` |
| `enum` | string | str | Must match one of `values` |
| `string[]` | array of strings | list[str] | |
| `integer[]` | array of numbers | list[int] | |

### 2.4 Condition Operators

| Operator | Applies To | Meaning |
|----------|-----------|---------|
| `==` | all | Exact equality |
| `!=` | all | Not equal |
| `>=`, `<=`, `>`, `<` | integer, float, date | Comparison |
| `in` | string, integer | Fact value is in the provided list |
| `not_in` | string, integer | Fact value is not in the list |
| `contains` | string, string[] | Fact contains the value |
| `between` | integer, float, date | Fact is within `[min, max]` inclusive |
| `within_months` | date | Fact date is within N months from today |
| `beyond_months` | date | Fact date is more than N months from today |
| `within_days` | date | Fact date is within N days from today |
| `matches` | string | Regex match |

### 2.5 Condition Logic

Conditions support `all` (AND) and `any` (OR) combinators, nestable:

```json
{
  "when": {
    "all": [
      { "fact": "age", "op": ">=", "value": 65 },
      {
        "any": [
          { "fact": "state", "op": "in", "value": ["NY", "CT"] },
          { "fact": "has_original_medicare", "op": "==", "value": true }
        ]
      }
    ]
  }
}
```

### 2.6 Computed Deadlines

The `deadline.compute` field supports simple date arithmetic:

```
"part_b_start_date + 6 months"
"current_plan_start_date + 12 months"
"trip_deposit_date + 21 days"
"2026-10-15"                          (literal date)
```

Parsed by a minimal expression evaluator — not `eval()`.

---

## 3. Engine Architecture

### 3.1 Core Module (`rules.py`)

```python
# Public API

def load_rules(domain: str) -> list[RuleSet]
    """Load all .rules.json files for a domain. Hot-reloads on file change."""

def evaluate(domain: str, facts: dict) -> EvaluationResult
    """Run all rules in a domain against user facts. Returns outcomes + trace."""

def validate_rules(domain: str) -> ValidationReport
    """Run smart checks on all rules in a domain."""

def list_domains() -> list[DomainInfo]
    """List available rule domains with file counts and freshness."""

def explain(outcomes: list[Outcome]) -> dict
    """Structure outcomes for LLM narration (does not call LLM itself)."""
```

### 3.2 Data Classes

```python
@dataclass
class Outcome:
    rule_id: str
    rule_name: str
    outcome: str          # e.g., "guaranteed_issue", "underwriting_required"
    severity: str         # "info", "warning", "error"
    message: str          # Human-readable explanation
    authority: str        # Source citation
    deadline: date | None # Computed deadline, if any
    deadline_label: str | None
    lead_time_days: int | None
    exceptions_applied: list[str]  # IDs of exceptions that modified the outcome

@dataclass
class EvaluationResult:
    domain: str
    facts: dict
    outcomes: list[Outcome]
    trace: list[TraceEntry]   # Which rules matched/skipped and why
    evaluated_at: datetime

@dataclass
class TraceEntry:
    rule_id: str
    matched: bool
    conditions_evaluated: list[ConditionTrace]  # Each condition's fact, op, value, result

@dataclass
class ValidationReport:
    domain: str
    schema_errors: list[str]
    conflicts: list[ConflictWarning]
    coverage_gaps: list[CoverageGap]
    staleness: list[StalenessWarning]
    valid: bool  # True if no schema_errors
```

### 3.3 Hot Reload

```python
_cache: dict[str, tuple[float, list[RuleSet]]] = {}

def load_rules(domain: str) -> list[RuleSet]:
    rules_dir = config.DATA_DIR / "rules" / domain
    # Sum of mtimes as simple change fingerprint
    mtimes = sum(f.stat().st_mtime for f in rules_dir.rglob("*.rules.json"))
    if domain in _cache and _cache[domain][0] == mtimes:
        return _cache[domain][1]
    # Reload from disk
    rule_sets = [_parse_file(f) for f in sorted(rules_dir.rglob("*.rules.json"))]
    _cache[domain] = (mtimes, rule_sets)
    return rule_sets
```

Drop a new `.rules.json` file → next `evaluate()` call picks it up automatically. No restart, no rebuild, no deployment.

### 3.4 Evaluation Loop

```python
def evaluate(domain: str, facts: dict) -> EvaluationResult:
    rule_sets = load_rules(domain)
    outcomes = []
    trace = []

    for rs in rule_sets:
        _validate_facts(facts, rs.facts_schema)  # Type check + required fields
        for rule in rs.rules:
            matched, condition_trace = _evaluate_conditions(rule.when, facts)
            trace.append(TraceEntry(rule.id, matched, condition_trace))
            if matched:
                outcome = _build_outcome(rule, facts, rs.meta)
                # Check exceptions
                for exc in rule.then.get("exceptions", []):
                    if _evaluate_condition(exc["when"], facts):
                        outcome = _apply_exception(outcome, exc)
                outcomes.append(outcome)

    return EvaluationResult(domain, facts, outcomes, trace, datetime.now())
```

---

## 4. Smart Checks

### 4.1 Schema Validation

Runs on every file load. Catches authoring errors before evaluation:

- Every `fact` referenced in `when` conditions exists in `facts_schema`
- Operators are valid for the fact's declared type (e.g., `within_months` only on `date` type)
- `enum` facts only compared against their declared `values`
- `compute` expressions reference valid fact names and use supported arithmetic
- `meta.id` is unique across all files in the domain
- Required `meta` fields are present (`id`, `version`, `domain`, `effective`, `expires`)

```json
{
  "check": "schema",
  "errors": [
    "enrollment-windows.rules.json: Rule 'late-penalty': fact 'enrollment_date' not in facts_schema",
    "switching-penalties.rules.json: Rule 'ma-trial': operator 'within_months' invalid for type 'boolean'"
  ],
  "warnings": [
    "medigap-guarantee.rules.json: meta.reviewed is null — rule has not been peer-reviewed"
  ]
}
```

### 4.2 Conflict Detection

Finds pairs of rules that can fire simultaneously with contradictory outcomes:

1. For each pair of rules in the domain, compute whether their condition spaces overlap
2. If both can match the same fact set, check if their outcomes conflict (e.g., `guaranteed_issue` vs `underwriting_required`)
3. Report the overlap with a synthetic example

```json
{
  "check": "conflicts",
  "warnings": [
    {
      "rules": ["medigap-oep", "ma-to-medigap-after-oep"],
      "overlap": "age>=65, current_plan_type=MA, part_b_start_date within 6 months",
      "outcomes": ["guaranteed_issue", "underwriting_required"],
      "suggestion": "Add mutual exclusion condition or define priority ordering"
    }
  ]
}
```

For complex condition spaces, the engine generates a bounded set of synthetic fact combinations (Latin hypercube sampling over the facts_schema value space) and checks for dual-fire.

**LLM assist:** After deterministic detection, Gemma can explain in plain English why the conflict matters and suggest a resolution.

### 4.3 Coverage Gap Analysis

Generates synthetic fact combinations and checks if any fall through without matching any rule:

1. Enumerate all enum values, sample integer ranges, generate boundary dates
2. Run each combination through the evaluator
3. Report scenarios with zero matching rules

```json
{
  "check": "coverage",
  "gaps": [
    {
      "scenario": { "age": 63, "has_original_medicare": true, "current_plan_type": "none" },
      "matched_rules": 0,
      "suggestion": "No rule covers under-65 with Original Medicare and no plan. Consider adding disability-based Medicare rule."
    }
  ]
}
```

### 4.4 Staleness Check

Compares `meta.expires` against today's date:

```json
{
  "check": "staleness",
  "warnings": [
    {
      "file": "federal-brackets-2026.rules.json",
      "expires": "2026-12-31",
      "days_remaining": 257,
      "status": "ok"
    },
    {
      "file": "nj-state-2025.rules.json",
      "expires": "2025-12-31",
      "days_remaining": -108,
      "status": "EXPIRED"
    }
  ]
}
```

Staleness warnings surface in:
- The validation API response
- The iHomeNerd System dashboard
- Agent notifications ("Your NJ tax rules expired 108 days ago — update needed")

---

## 5. LLM + Rules Collaboration

The rules engine and LLM have distinct, complementary roles:

```
User question (natural language)
    │
    ▼
┌─────────────────────────┐
│ Gemma: Extract Facts     │  LLM parses free text into structured facts
│ "I'm 67, in NJ, on MA   │  → { age: 67, state: "NJ",
│  for 8 months"           │      current_plan_type: "MA", ... }
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Rules Engine: Evaluate   │  Deterministic — no LLM involved
│ (rules.py)               │  Returns: outcomes[] + trace[]
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Gemma: Narrate           │  LLM turns outcomes into plain English
│ System prompt includes:  │  with citations from rule authority
│ - outcomes + trace       │  NEVER overrides the engine's computation
│ - authority citations    │
│ - user's original query  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ UI: Display              │  Shows both:
│ - Plain English story    │  - Gemma's narrative (for readability)
│ - Raw rule trace         │  - Rule trace (for auditability)
└─────────────────────────┘
```

**Critical constraint:** The LLM narration prompt includes `"You MUST NOT contradict the rule engine outcomes. If the engine says 'underwriting_required', do not suggest the user has guaranteed issue. Your role is to explain, not to decide."` This is enforced by including the raw outcomes in the response so the user can verify.

---

## 6. API Endpoints

### 6.1 Evaluate Rules

```
POST /v1/rules/evaluate
Content-Type: application/json

{
  "domain": "medicare",
  "facts": {
    "age": 67,
    "state": "NJ",
    "has_original_medicare": true,
    "part_b_start_date": "2026-04-01",
    "current_plan_type": "MA",
    "current_plan_start_date": "2025-08-15"
  }
}

Response 200:
{
  "domain": "medicare",
  "outcomes": [
    {
      "rule_id": "ma-trial-right",
      "rule_name": "Medicare Advantage Trial Right",
      "outcome": "trial_right_active",
      "severity": "info",
      "message": "You have a 12-month trial right...",
      "authority": "CMS Medicare & You 2026, pp. 61-63",
      "deadline": "2026-08-15",
      "deadline_label": "MA Trial Right expires",
      "lead_time_days": 90,
      "exceptions_applied": []
    }
  ],
  "trace": [...],
  "evaluated_at": "2026-04-18T14:30:00Z"
}
```

### 6.2 List Domains

```
GET /v1/rules/domains

Response 200:
[
  {
    "domain": "medicare",
    "title": "Medicare & Medigap Rules",
    "file_count": 4,
    "rule_count": 12,
    "oldest_expiry": "2026-12-31",
    "has_expired": false
  }
]
```

### 6.3 Validate Rules

```
GET /v1/rules/validate/medicare

Response 200:
{
  "domain": "medicare",
  "valid": true,
  "schema_errors": [],
  "conflicts": [],
  "coverage_gaps": [
    {
      "scenario": { "age": 63, "has_original_medicare": true, "current_plan_type": "none" },
      "matched_rules": 0,
      "suggestion": "No rule for under-65 disability-based Medicare"
    }
  ],
  "staleness": [
    { "file": "enrollment-windows.rules.json", "expires": "2026-12-31", "status": "ok" }
  ]
}
```

### 6.4 List Rule Files

```
GET /v1/rules/files/medicare

Response 200:
[
  {
    "file": "enrollment-windows.rules.json",
    "title": "Medicare Enrollment Windows",
    "version": "2026-01",
    "effective": "2026-01-01",
    "expires": "2026-12-31",
    "rule_count": 4,
    "author": "alex",
    "reviewed": null
  }
]
```

### 6.5 Export Deadlines (Deadline Broker)

```
POST /v1/rules/deadlines
Content-Type: application/json

{
  "domain": "medicare",
  "facts": { ... },
  "format": "ics"       // or "whowhe2wha" or "json"
}

Response 200 (format=ics):
Content-Type: text/calendar
<.ics file content>

Response 200 (format=whowhe2wha):
{
  "events": [
    {
      "what": { "name": "MA Trial Right expires", "whatType": "Deadline", "leadTimeDays": 90 },
      "when": { "timestamp": "2026-08-15T00:00:00Z" },
      "project": { "name": "Medicare Enrollment", "category": "Health" },
      "source_rule": "medicare.switching.ma-trial-right"
    }
  ]
}
```

---

## 7. Open-Source Rule Packs

### 7.1 Repository

```
github.com/llm-case-studies/iHomeNerd-rules
License: CC BY-SA 4.0

├── medicare/
├── tax/
├── medical-coding/
├── travel-insurance/
├── schema/
│   └── rule-format.json        ← JSON Schema for .rules.json files
├── CONTRIBUTING.md
├── README.md
└── LICENSE
```

### 7.2 Who Writes Rules

| Source | Process | Validation |
|--------|---------|------------|
| **Core team** | Hand-authored for high-stakes domains | Smart checks + peer review |
| **Gemma (AI-assisted)** | User uploads a policy PDF → Docs RAG extracts terms → Gemma proposes `.rules.json` | Smart checks + **human review before activation** |
| **Community** | PR to `iHomeNerd-rules` repo | Schema validation CI + domain expert review |

### 7.3 Update Cycle

| Domain | Update Frequency | Trigger |
|--------|-----------------|---------|
| Medicare | Annual | CMS publishes "Medicare & You" each October |
| Federal Tax | Annual | IRS announces brackets each November |
| State Tax | Annual | State legislatures, varies |
| Medical Coding | Annual | AMA CPT updates each January |
| Payer-Specific | As needed | Payer policy changes |
| Travel Insurance | Per-policy | User uploads new policy document |

### 7.4 Sync to Local

```bash
# Initial setup
cd ~/.ihomenerd/rules
git clone https://github.com/llm-case-studies/iHomeNerd-rules.git community

# Update (could be automated via agent)
cd ~/.ihomenerd/rules/community
git pull
```

Community rules live alongside user's custom rules. The engine scans both:
```
~/.ihomenerd/rules/
├── medicare/                    ← user's custom/override rules
├── community/                   ← git clone of iHomeNerd-rules
│   ├── medicare/
│   ├── tax/
│   └── ...
```

User rules take precedence over community rules when rule IDs overlap.

---

## 8. Testing Strategy

### 8.1 Unit Tests

Each `.rules.json` file should have a companion `.test.json` with known fact → outcome pairs:

```json
{
  "rule_file": "enrollment-windows.rules.json",
  "tests": [
    {
      "name": "65yo in OEP window",
      "facts": { "age": 65, "has_original_medicare": true, "part_b_start_date": "2026-02-01" },
      "expect_outcomes": ["guaranteed_issue"],
      "expect_deadlines": [{ "label": "Medigap OEP closes", "date": "2026-08-01" }]
    },
    {
      "name": "67yo past OEP in NY",
      "facts": { "age": 67, "state": "NY", "has_original_medicare": true, "part_b_start_date": "2024-01-01", "current_plan_type": "MA" },
      "expect_outcomes": ["guaranteed_issue"],
      "expect_exceptions": ["NY year-round guaranteed issue"]
    }
  ]
}
```

### 8.2 CI for Open-Source Repo

GitHub Actions on every PR:
1. JSON Schema validation (all `.rules.json` files conform to `schema/rule-format.json`)
2. Smart checks (schema + conflict + coverage) via a lightweight Python runner
3. Test file execution (`.test.json` → expected outcomes)
4. Staleness report (flag any rules expiring within 60 days)

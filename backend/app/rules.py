"""Rules engine — deterministic, JSON-driven evaluation for high-stakes decisions.

Rules are defined in .rules.json files under ~/.ihomenerd/rules/<domain>/.
The engine loads, caches, evaluates, and validates rules without any LLM involvement.
The LLM narrates outcomes but never decides them.

Spec: docs/RULES_ENGINE_SPEC_2026-04-18.md
"""

from __future__ import annotations

import calendar
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

from .config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class RuleMeta:
    id: str
    version: str
    domain: str
    title: str
    authority: str = ""
    authority_url: str = ""
    effective: str = ""
    expires: str = ""
    author: str = ""
    reviewed: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class FactSchema:
    name: str
    type: str  # integer, float, string, boolean, date, enum, string[], integer[]
    required: bool = False
    default: Any = None
    values: list[str] | None = None  # for enum type


@dataclass
class Condition:
    fact: str
    op: str
    value: Any


@dataclass
class ConditionGroup:
    combinator: str  # "all" or "any"
    children: list[Condition | ConditionGroup] = field(default_factory=list)


@dataclass
class ExceptionDef:
    when: Condition | ConditionGroup
    override_outcome: str = ""
    override_severity: str = ""
    override_message: str = ""
    note: str = ""


@dataclass
class DeadlineDef:
    compute: str
    label: str = ""
    lead_time_days: int = 0


@dataclass
class RuleThen:
    outcome: str
    severity: str = "info"
    message: str = ""
    deadline: DeadlineDef | None = None
    exceptions: list[ExceptionDef] = field(default_factory=list)


@dataclass
class Rule:
    id: str
    name: str
    description: str
    when: ConditionGroup
    then: RuleThen


@dataclass
class RuleSet:
    meta: RuleMeta
    facts_schema: dict[str, FactSchema]
    rules: list[Rule]
    source_file: str = ""


@dataclass
class Outcome:
    rule_id: str
    rule_name: str
    outcome: str
    severity: str
    message: str
    authority: str = ""
    authority_url: str = ""
    deadline: date | None = None
    deadline_label: str = ""
    lead_time_days: int = 0
    exceptions_applied: list[str] = field(default_factory=list)


@dataclass
class ConditionTrace:
    fact: str
    op: str
    expected: Any
    actual: Any
    result: bool


@dataclass
class TraceEntry:
    rule_id: str
    matched: bool
    conditions: list[ConditionTrace] = field(default_factory=list)


@dataclass
class EvaluationResult:
    domain: str
    facts: dict
    outcomes: list[Outcome]
    trace: list[TraceEntry]
    evaluated_at: str  # ISO timestamp


@dataclass
class DomainInfo:
    domain: str
    title: str
    file_count: int
    rule_count: int
    oldest_expiry: str | None
    has_expired: bool


@dataclass
class StalenessEntry:
    file: str
    title: str
    expires: str
    days_remaining: int
    status: str  # "ok", "expiring_soon", "EXPIRED"


@dataclass
class ValidationReport:
    domain: str
    schema_errors: list[str]
    staleness: list[StalenessEntry]
    valid: bool


# ---------------------------------------------------------------------------
# Date arithmetic (stdlib only, no dateutil)
# ---------------------------------------------------------------------------


def _add_months(d: date, months: int) -> date:
    """Add N months to a date, clamping day to valid range."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(d.day, max_day))


def _parse_date(s: str) -> date:
    """Parse an ISO date string (YYYY-MM-DD) to a date object."""
    return date.fromisoformat(s)


# ---------------------------------------------------------------------------
# Condition operators
# ---------------------------------------------------------------------------

_today_override: date | None = None  # for testing


def _today() -> date:
    return _today_override or date.today()


def _op_within_months(fact_val: date, n: int) -> bool:
    """True if fact_date + N months >= today (the window hasn't closed)."""
    return _add_months(fact_val, n) >= _today()


def _op_beyond_months(fact_val: date, n: int) -> bool:
    """True if fact_date + N months < today (the window has closed)."""
    return _add_months(fact_val, n) < _today()


def _op_within_days(fact_val: date, n: int) -> bool:
    """True if fact_date + N days >= today."""
    from datetime import timedelta
    return fact_val + timedelta(days=n) >= _today()


OPERATORS: dict[str, Any] = {
    "==": lambda f, v: f == v,
    "!=": lambda f, v: f != v,
    ">=": lambda f, v: f >= v,
    "<=": lambda f, v: f <= v,
    ">": lambda f, v: f > v,
    "<": lambda f, v: f < v,
    "in": lambda f, v: f in v,
    "not_in": lambda f, v: f not in v,
    "contains": lambda f, v: v in f,
    "between": lambda f, v: v[0] <= f <= v[1],
    "within_months": _op_within_months,
    "beyond_months": _op_beyond_months,
    "within_days": _op_within_days,
    "matches": lambda f, v: bool(re.search(v, str(f))),
}

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def _parse_condition_block(block: dict) -> Condition | ConditionGroup:
    """Parse a condition block recursively (handles all/any/leaf)."""
    if "all" in block:
        return ConditionGroup(
            combinator="all",
            children=[_parse_condition_block(c) for c in block["all"]],
        )
    if "any" in block:
        return ConditionGroup(
            combinator="any",
            children=[_parse_condition_block(c) for c in block["any"]],
        )
    # Leaf condition
    return Condition(fact=block["fact"], op=block["op"], value=block["value"])


def _parse_deadline(d: dict) -> DeadlineDef:
    return DeadlineDef(
        compute=d.get("compute", ""),
        label=d.get("label", ""),
        lead_time_days=d.get("lead_time_days", 0),
    )


def _parse_exception(exc: dict) -> ExceptionDef:
    when_block = exc.get("when", exc)
    # If the exception has a top-level "when" key, parse it
    if "when" in exc:
        when = _parse_condition_block(exc["when"])
    else:
        # Inline condition: { "state_in": [...], ... } — skip, not standard format
        when = ConditionGroup(combinator="all", children=[])

    return ExceptionDef(
        when=when,
        override_outcome=exc.get("override_outcome", ""),
        override_severity=exc.get("override_severity", ""),
        override_message=exc.get("override_message", ""),
        note=exc.get("note", ""),
    )


def _parse_rule(raw: dict) -> Rule:
    then_raw = raw["then"]
    deadline = _parse_deadline(then_raw["deadline"]) if "deadline" in then_raw else None
    exceptions = [_parse_exception(e) for e in then_raw.get("exceptions", [])]

    return Rule(
        id=raw["id"],
        name=raw.get("name", raw["id"]),
        description=raw.get("description", ""),
        when=_parse_condition_block(raw["when"]),
        then=RuleThen(
            outcome=then_raw["outcome"],
            severity=then_raw.get("severity", "info"),
            message=then_raw.get("message", ""),
            deadline=deadline,
            exceptions=exceptions,
        ),
    )


def _parse_facts_schema(raw: dict) -> dict[str, FactSchema]:
    result = {}
    for name, spec in raw.items():
        result[name] = FactSchema(
            name=name,
            type=spec.get("type", "string"),
            required=spec.get("required", False),
            default=spec.get("default"),
            values=spec.get("values"),
        )
    return result


def _parse_file(path: Path) -> RuleSet:
    """Parse a .rules.json file into a RuleSet."""
    with open(path) as f:
        data = json.load(f)

    meta_raw = data.get("meta", {})
    meta = RuleMeta(
        id=meta_raw.get("id", path.stem),
        version=meta_raw.get("version", ""),
        domain=meta_raw.get("domain", ""),
        title=meta_raw.get("title", path.stem),
        authority=meta_raw.get("authority", ""),
        authority_url=meta_raw.get("authority_url", ""),
        effective=meta_raw.get("effective", ""),
        expires=meta_raw.get("expires", ""),
        author=meta_raw.get("author", ""),
        reviewed=meta_raw.get("reviewed"),
        tags=meta_raw.get("tags", []),
    )

    facts_schema = _parse_facts_schema(data.get("facts_schema", {}))
    rules = [_parse_rule(r) for r in data.get("rules", [])]

    return RuleSet(meta=meta, facts_schema=facts_schema, rules=rules, source_file=path.name)


# ---------------------------------------------------------------------------
# Hot-reload cache
# ---------------------------------------------------------------------------

_cache: dict[str, tuple[float, list[RuleSet]]] = {}


def _rules_dir() -> Path:
    return settings.data_dir / "rules"


def load_rules(domain: str) -> list[RuleSet]:
    """Load all .rules.json files for a domain. Hot-reloads on file change."""
    domain_dir = _rules_dir() / domain
    if not domain_dir.exists():
        raise FileNotFoundError(f"Rules domain not found: {domain}")

    files = sorted(domain_dir.rglob("*.rules.json"))
    if not files:
        return []

    fingerprint = sum(f.stat().st_mtime for f in files)
    if domain in _cache and _cache[domain][0] == fingerprint:
        return _cache[domain][1]

    rule_sets = []
    for f in files:
        try:
            rule_sets.append(_parse_file(f))
        except Exception as e:
            logger.warning("Failed to parse %s: %s", f, e)

    _cache[domain] = (fingerprint, rule_sets)
    logger.info("Loaded %d rule files for domain '%s'", len(rule_sets), domain)
    return rule_sets


def clear_cache():
    """Clear the rules cache (useful for testing)."""
    _cache.clear()


# ---------------------------------------------------------------------------
# Fact validation
# ---------------------------------------------------------------------------


def _validate_and_coerce_facts(facts: dict, schema: dict[str, FactSchema]) -> dict:
    """Validate facts against schema, coerce types, apply defaults. Returns coerced copy."""
    coerced = dict(facts)

    for name, spec in schema.items():
        if name not in coerced:
            if spec.required:
                raise ValueError(f"Missing required fact: {name}")
            if spec.default is not None:
                coerced[name] = spec.default
            continue

        val = coerced[name]

        # Type coercion
        if spec.type == "date" and isinstance(val, str):
            try:
                coerced[name] = _parse_date(val)
            except ValueError:
                raise ValueError(f"Invalid date for fact '{name}': {val}")
        elif spec.type == "integer":
            if not isinstance(val, int):
                raise ValueError(f"Fact '{name}' must be integer, got {type(val).__name__}")
        elif spec.type == "float":
            if not isinstance(val, (int, float)):
                raise ValueError(f"Fact '{name}' must be numeric, got {type(val).__name__}")
        elif spec.type == "boolean":
            if not isinstance(val, bool):
                raise ValueError(f"Fact '{name}' must be boolean, got {type(val).__name__}")
        elif spec.type == "enum":
            if spec.values and val not in spec.values:
                raise ValueError(f"Fact '{name}' must be one of {spec.values}, got '{val}'")
        elif spec.type == "string":
            if not isinstance(val, str):
                raise ValueError(f"Fact '{name}' must be string, got {type(val).__name__}")

    return coerced


# ---------------------------------------------------------------------------
# Condition evaluation
# ---------------------------------------------------------------------------


def _evaluate_single(cond: Condition, facts: dict) -> tuple[bool, ConditionTrace]:
    """Evaluate a single leaf condition against facts."""
    actual = facts.get(cond.fact)
    op_fn = OPERATORS.get(cond.op)
    if op_fn is None:
        logger.warning("Unknown operator '%s' in condition for fact '%s'", cond.op, cond.fact)
        return False, ConditionTrace(cond.fact, cond.op, cond.value, actual, False)

    if actual is None:
        return False, ConditionTrace(cond.fact, cond.op, cond.value, None, False)

    try:
        result = op_fn(actual, cond.value)
    except Exception as e:
        logger.warning("Operator '%s' failed for fact '%s': %s", cond.op, cond.fact, e)
        result = False

    return result, ConditionTrace(cond.fact, cond.op, cond.value, _serialize(actual), result)


def _serialize(val: Any) -> Any:
    """Convert internal types to JSON-serializable form for traces."""
    if isinstance(val, date):
        return val.isoformat()
    return val


def _evaluate_conditions(
    node: Condition | ConditionGroup, facts: dict
) -> tuple[bool, list[ConditionTrace]]:
    """Evaluate a condition tree against facts. Returns (matched, trace)."""
    if isinstance(node, Condition):
        result, trace = _evaluate_single(node, facts)
        return result, [trace]

    traces: list[ConditionTrace] = []
    if node.combinator == "all":
        for child in node.children:
            result, child_traces = _evaluate_conditions(child, facts)
            traces.extend(child_traces)
            if not result:
                return False, traces
        return True, traces
    else:  # "any"
        for child in node.children:
            result, child_traces = _evaluate_conditions(child, facts)
            traces.extend(child_traces)
            if result:
                return True, traces
        return False, traces


# ---------------------------------------------------------------------------
# Deadline computation
# ---------------------------------------------------------------------------

_DEADLINE_RE = re.compile(r"^(\S+)\s*\+\s*(\d+)\s+(months?|days?)$")


def _compute_deadline(expr: str, facts: dict) -> date | None:
    """Compute a deadline from an expression like 'part_b_start_date + 6 months'."""
    expr = expr.strip()

    # Literal ISO date
    try:
        return _parse_date(expr)
    except ValueError:
        pass

    m = _DEADLINE_RE.match(expr)
    if not m:
        logger.warning("Cannot parse deadline expression: %s", expr)
        return None

    fact_name, amount, unit = m.group(1), int(m.group(2)), m.group(3)
    base = facts.get(fact_name)
    if not isinstance(base, date):
        logger.warning("Deadline fact '%s' is not a date: %s", fact_name, base)
        return None

    if unit.startswith("month"):
        return _add_months(base, amount)
    else:
        from datetime import timedelta
        return base + timedelta(days=amount)


# ---------------------------------------------------------------------------
# Outcome building
# ---------------------------------------------------------------------------


def _build_outcome(rule: Rule, facts: dict, meta: RuleMeta) -> Outcome:
    """Build an Outcome from a matched rule."""
    t = rule.then
    dl = None
    dl_label = ""
    dl_lead = 0
    if t.deadline:
        dl = _compute_deadline(t.deadline.compute, facts)
        dl_label = t.deadline.label
        dl_lead = t.deadline.lead_time_days

    return Outcome(
        rule_id=rule.id,
        rule_name=rule.name,
        outcome=t.outcome,
        severity=t.severity,
        message=t.message,
        authority=meta.authority,
        authority_url=meta.authority_url,
        deadline=dl,
        deadline_label=dl_label,
        lead_time_days=dl_lead,
    )


def _apply_exceptions(outcome: Outcome, exceptions: list[ExceptionDef], facts: dict) -> Outcome:
    """Check and apply exception overrides to an outcome."""
    for exc in exceptions:
        matched, _ = _evaluate_conditions(exc.when, facts)
        if matched:
            if exc.override_outcome:
                outcome.outcome = exc.override_outcome
            if exc.override_severity:
                outcome.severity = exc.override_severity
            if exc.override_message:
                outcome.message = exc.override_message
            outcome.exceptions_applied.append(exc.note or "exception-applied")
    return outcome


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def evaluate(domain: str, facts: dict) -> EvaluationResult:
    """Evaluate all rules in a domain against user facts.

    Returns outcomes (matched rules) and a full trace (all rules, matched or not).
    """
    rule_sets = load_rules(domain)
    outcomes: list[Outcome] = []
    trace: list[TraceEntry] = []

    for rs in rule_sets:
        coerced = _validate_and_coerce_facts(facts, rs.facts_schema)
        for rule in rs.rules:
            matched, cond_traces = _evaluate_conditions(rule.when, coerced)
            trace.append(TraceEntry(rule_id=rule.id, matched=matched, conditions=cond_traces))
            if matched:
                outcome = _build_outcome(rule, coerced, rs.meta)
                outcome = _apply_exceptions(outcome, rule.then.exceptions, coerced)
                outcomes.append(outcome)

    return EvaluationResult(
        domain=domain,
        facts=facts,
        outcomes=outcomes,
        trace=trace,
        evaluated_at=datetime.now().isoformat(),
    )


def list_domains() -> list[DomainInfo]:
    """List available rule domains with metadata."""
    rules_root = _rules_dir()
    if not rules_root.exists():
        return []

    domains = []
    for d in sorted(rules_root.iterdir()):
        if not d.is_dir():
            continue
        files = list(d.rglob("*.rules.json"))
        if not files:
            continue

        rule_sets = load_rules(d.name)
        total_rules = sum(len(rs.rules) for rs in rule_sets)

        # Find oldest expiry
        expiries = [rs.meta.expires for rs in rule_sets if rs.meta.expires]
        oldest_expiry = min(expiries) if expiries else None
        has_expired = False
        if oldest_expiry:
            try:
                has_expired = _parse_date(oldest_expiry) < _today()
            except ValueError:
                pass

        # Title from first rule set
        title = rule_sets[0].meta.title if rule_sets else d.name

        domains.append(DomainInfo(
            domain=d.name,
            title=title,
            file_count=len(files),
            rule_count=total_rules,
            oldest_expiry=oldest_expiry,
            has_expired=has_expired,
        ))

    return domains


def validate_rules(domain: str) -> ValidationReport:
    """Run smart checks on all rules in a domain.

    V1 scope: schema validation + staleness checks.
    """
    rule_sets = load_rules(domain)
    errors: list[str] = []
    staleness: list[StalenessEntry] = []

    for rs in rule_sets:
        # Schema validation: check that rule conditions reference valid facts
        for rule in rs.rules:
            _validate_rule_conditions(rule, rs.facts_schema, rs.source_file, errors)

        # Staleness check
        if rs.meta.expires:
            try:
                exp_date = _parse_date(rs.meta.expires)
                days_left = (exp_date - _today()).days
                if days_left < 0:
                    status = "EXPIRED"
                elif days_left < 60:
                    status = "expiring_soon"
                else:
                    status = "ok"
                staleness.append(StalenessEntry(
                    file=rs.source_file,
                    title=rs.meta.title,
                    expires=rs.meta.expires,
                    days_remaining=days_left,
                    status=status,
                ))
            except ValueError:
                errors.append(f"{rs.source_file}: Invalid expires date '{rs.meta.expires}'")

    return ValidationReport(
        domain=domain,
        schema_errors=errors,
        staleness=staleness,
        valid=len(errors) == 0,
    )


def _validate_rule_conditions(
    rule: Rule, schema: dict[str, FactSchema], source: str, errors: list[str]
):
    """Check that a rule's conditions reference valid facts and operators."""
    _walk_conditions(rule.when, schema, source, rule.id, errors)


def _walk_conditions(
    node: Condition | ConditionGroup,
    schema: dict[str, FactSchema],
    source: str,
    rule_id: str,
    errors: list[str],
):
    if isinstance(node, Condition):
        if node.fact not in schema:
            errors.append(f"{source}: Rule '{rule_id}': fact '{node.fact}' not in facts_schema")
        if node.op not in OPERATORS:
            errors.append(f"{source}: Rule '{rule_id}': unknown operator '{node.op}'")
        # Type-specific operator checks
        if node.fact in schema:
            fact_type = schema[node.fact].type
            date_ops = {"within_months", "beyond_months", "within_days"}
            if node.op in date_ops and fact_type != "date":
                errors.append(
                    f"{source}: Rule '{rule_id}': operator '{node.op}' requires date type, "
                    f"but fact '{node.fact}' is {fact_type}"
                )
    elif isinstance(node, ConditionGroup):
        for child in node.children:
            _walk_conditions(child, schema, source, rule_id, errors)


def get_rule_files(domain: str) -> list[dict]:
    """List rule files in a domain with metadata."""
    rule_sets = load_rules(domain)
    return [
        {
            "file": rs.source_file,
            "title": rs.meta.title,
            "version": rs.meta.version,
            "effective": rs.meta.effective,
            "expires": rs.meta.expires,
            "rule_count": len(rs.rules),
            "author": rs.meta.author,
            "reviewed": rs.meta.reviewed,
        }
        for rs in rule_sets
    ]


def explain(outcomes: list[Outcome]) -> dict:
    """Structure outcomes for LLM narration. Does NOT call the LLM."""
    return {
        "outcome_count": len(outcomes),
        "outcomes": [
            {
                "rule": o.rule_name,
                "result": o.outcome,
                "severity": o.severity,
                "message": o.message,
                "authority": o.authority,
                "deadline": o.deadline.isoformat() if o.deadline else None,
                "deadline_label": o.deadline_label,
            }
            for o in outcomes
        ],
        "prompt_hint": (
            "You MUST NOT contradict the rule engine outcomes. "
            "Your role is to explain these results in plain English, not to decide. "
            "Cite the authority for each outcome."
        ),
    }

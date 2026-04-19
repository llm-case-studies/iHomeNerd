"""Rules domain — deterministic rule evaluation for high-stakes decisions.

Exposes the rules engine via REST endpoints. Rules are JSON files
under ~/.ihomenerd/rules/<domain>/ — no LLM involved in evaluation.

Spec: docs/RULES_ENGINE_SPEC_2026-04-18.md
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import rules

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/rules", tags=["rules"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class EvaluateRequest(BaseModel):
    domain: str
    facts: Dict[str, Any]


class OutcomeResponse(BaseModel):
    rule_id: str
    rule_name: str
    outcome: str
    severity: str
    message: str
    authority: str = ""
    authority_url: str = ""
    deadline: Optional[str] = None
    deadline_label: str = ""
    lead_time_days: int = 0
    exceptions_applied: List[str] = Field(default_factory=list)


class ConditionTraceResponse(BaseModel):
    fact: str
    op: str
    expected: Any
    actual: Any
    result: bool


class TraceEntryResponse(BaseModel):
    rule_id: str
    matched: bool
    conditions: List[ConditionTraceResponse] = Field(default_factory=list)


class EvaluateResponse(BaseModel):
    domain: str
    outcomes: List[OutcomeResponse]
    trace: List[TraceEntryResponse]
    evaluated_at: str


class DomainResponse(BaseModel):
    domain: str
    title: str
    file_count: int
    rule_count: int
    oldest_expiry: Optional[str] = None
    has_expired: bool = False


class FileInfoResponse(BaseModel):
    file: str
    title: str
    version: str = ""
    effective: str = ""
    expires: str = ""
    rule_count: int = 0
    author: str = ""
    reviewed: Optional[str] = None


class StalenessResponse(BaseModel):
    file: str
    title: str
    expires: str
    days_remaining: int
    status: str


class ValidateResponse(BaseModel):
    domain: str
    valid: bool
    schema_errors: List[str] = Field(default_factory=list)
    staleness: List[StalenessResponse] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Converters
# ---------------------------------------------------------------------------


def _outcome_to_response(o: rules.Outcome) -> OutcomeResponse:
    return OutcomeResponse(
        rule_id=o.rule_id,
        rule_name=o.rule_name,
        outcome=o.outcome,
        severity=o.severity,
        message=o.message,
        authority=o.authority,
        authority_url=o.authority_url,
        deadline=o.deadline.isoformat() if o.deadline else None,
        deadline_label=o.deadline_label,
        lead_time_days=o.lead_time_days,
        exceptions_applied=o.exceptions_applied,
    )


def _trace_to_response(t: rules.TraceEntry) -> TraceEntryResponse:
    return TraceEntryResponse(
        rule_id=t.rule_id,
        matched=t.matched,
        conditions=[
            ConditionTraceResponse(
                fact=c.fact, op=c.op, expected=c.expected, actual=c.actual, result=c.result
            )
            for c in t.conditions
        ],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_rules(req: EvaluateRequest):
    """Evaluate all rules in a domain against user-supplied facts.

    Returns matched outcomes with audit trace.
    """
    try:
        result = rules.evaluate(req.domain, req.facts)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Unknown rules domain: {req.domain}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return EvaluateResponse(
        domain=result.domain,
        outcomes=[_outcome_to_response(o) for o in result.outcomes],
        trace=[_trace_to_response(t) for t in result.trace],
        evaluated_at=result.evaluated_at,
    )


@router.get("/domains", response_model=List[DomainResponse])
async def list_domains():
    """List available rule domains with metadata."""
    return [
        DomainResponse(
            domain=d.domain,
            title=d.title,
            file_count=d.file_count,
            rule_count=d.rule_count,
            oldest_expiry=d.oldest_expiry,
            has_expired=d.has_expired,
        )
        for d in rules.list_domains()
    ]


@router.get("/validate/{domain}", response_model=ValidateResponse)
async def validate_domain(domain: str):
    """Run smart checks on all rules in a domain."""
    try:
        report = rules.validate_rules(domain)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Unknown rules domain: {domain}")

    return ValidateResponse(
        domain=report.domain,
        valid=report.valid,
        schema_errors=report.schema_errors,
        staleness=[
            StalenessResponse(
                file=s.file, title=s.title, expires=s.expires,
                days_remaining=s.days_remaining, status=s.status,
            )
            for s in report.staleness
        ],
    )


@router.get("/files/{domain}", response_model=List[FileInfoResponse])
async def list_files(domain: str):
    """List rule files in a domain with metadata."""
    try:
        files = rules.get_rule_files(domain)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Unknown rules domain: {domain}")

    return [FileInfoResponse(**f) for f in files]

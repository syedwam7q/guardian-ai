"""Core data schemas for the GuardianAI governance plane."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Severity(IntEnum):
    SAFE = 0
    WATCH = 1
    WARN = 2
    BLOCK = 3


class AgentName(StrEnum):
    PROMPT_INJECTION = "prompt_injection"
    PII_IN = "pii_in"
    POLICY = "policy"
    HALLUCINATION = "hallucination"
    BIAS = "bias"
    PII_OUT = "pii_out"
    COST = "cost"


class Stage(StrEnum):
    PREFLIGHT = "preflight"
    INFLIGHT = "inflight"
    POSTFLIGHT = "postflight"
    CAUSAL = "causal"
    DECISION = "decision"
    REMEDIATE = "remediate"


class Action(StrEnum):
    BLOCK = "block"
    REWRITE = "rewrite"
    REDACT = "redact"
    FALLBACK_MODEL = "fallback_model"
    REGENERATE_WITH_CONTEXT = "regenerate_with_context"
    ADD_DISCLAIMER = "add_disclaimer"
    ALERT = "alert"
    LOG = "log"
    ALERT_AND_PROCEED = "alert_and_proceed"


def _now() -> datetime:
    return datetime.now(UTC)


class Verdict(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent: AgentName
    severity: Severity
    confidence: float = Field(..., ge=0.0, le=1.0)
    evidence: dict[str, Any] = Field(default_factory=dict)
    latency_ms: float = 0.0
    timestamp: datetime = Field(default_factory=_now)

    @model_validator(mode="after")
    def _evidence_required_for_non_safe(self) -> Verdict:
        if self.severity != Severity.SAFE and not self.evidence:
            raise ValueError(f"Evidence required when severity={self.severity.name}")
        return self


class Violation(BaseModel):
    model_config = ConfigDict(frozen=True)

    agent: AgentName
    severity: Severity
    summary: str
    evidence: dict[str, Any]
    confidence: float = Field(..., ge=0.0, le=1.0)


class Trace(BaseModel):
    model_config = ConfigDict(frozen=True)

    trace_id: UUID = Field(default_factory=uuid4)
    session_id: str
    user_input: str
    sanitized_input: str | None = None
    retrieved_docs: list[dict[str, Any]] = Field(default_factory=list)
    prompt: str | None = None
    model_params: dict[str, Any] = Field(default_factory=dict)
    output: str | None = None
    stage_data: dict[Stage, dict[str, Any]] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=_now)


class Decision(BaseModel):
    model_config = ConfigDict(frozen=True)

    action: Action
    rationale: str = Field(..., min_length=1)
    alternatives_considered: list[dict[str, Any]]
    expected_outcome: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    causal_attribution: list[dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=_now)

    @model_validator(mode="after")
    def _block_requires_alternatives(self) -> Decision:
        if self.action == Action.BLOCK and len(self.alternatives_considered) == 0:
            raise ValueError("BLOCK action requires at least one alternative considered")
        return self


class GovernanceRequest(BaseModel):
    user_input: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)
    domain: str = "medical"
    metadata: dict[str, Any] = Field(default_factory=dict)


class GovernanceResponse(BaseModel):
    trace_id: UUID
    final_output: str
    blocked: bool
    verdicts: list[Verdict]
    violations: list[Violation]
    decision: Decision | None = None
    total_latency_ms: float

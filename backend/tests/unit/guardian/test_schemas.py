"""Schema invariants for governance plane."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.guardian.schemas import (
    Action,
    AgentName,
    Decision,
    GovernanceRequest,
    Severity,
    Stage,
    Trace,
    Verdict,
)


def test_severity_ordering():
    assert Severity.SAFE < Severity.WATCH < Severity.WARN < Severity.BLOCK


def test_verdict_requires_evidence_when_not_safe():
    Verdict(
        agent=AgentName.HALLUCINATION,
        severity=Severity.BLOCK,
        confidence=0.95,
        evidence={"unsupported_spans": ["claim X"]},
    )
    with pytest.raises(ValidationError):
        Verdict(agent=AgentName.HALLUCINATION, severity=Severity.BLOCK, confidence=0.95)


def test_verdict_safe_allows_no_evidence():
    v = Verdict(agent=AgentName.HALLUCINATION, severity=Severity.SAFE, confidence=0.99)
    assert v.evidence == {}


def test_trace_immutable_after_creation():
    t = Trace(
        trace_id=uuid4(),
        session_id="s1",
        user_input="hi",
        stage_data={Stage.PREFLIGHT: {"latency_ms": 12}},
    )
    with pytest.raises(ValidationError):
        t.user_input = "different"  # type: ignore[misc]


def test_decision_requires_alternatives_when_action_is_block():
    Decision(
        action=Action.BLOCK,
        rationale="Prompt injection detected",
        alternatives_considered=[
            {"action": "ALERT_AND_PROCEED", "score": 0.4},
        ],
        expected_outcome="Adversarial input neutralized",
        confidence=0.92,
    )
    with pytest.raises(ValidationError):
        Decision(
            action=Action.BLOCK,
            rationale="x",
            alternatives_considered=[],
            expected_outcome="y",
            confidence=0.5,
        )


def test_governance_request_round_trip_json():
    req = GovernanceRequest(
        user_input="What is paracetamol's max daily dose?",
        session_id="sess_123",
        domain="medical",
    )
    payload = req.model_dump_json()
    restored = GovernanceRequest.model_validate_json(payload)
    assert restored.user_input == req.user_input

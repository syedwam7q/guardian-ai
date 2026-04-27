import pytest

from src.guardian.decision import DecisionEngine
from src.guardian.schemas import Action, AgentName, Severity, Violation


@pytest.fixture
def engine():
    return DecisionEngine()


@pytest.mark.asyncio
async def test_block_on_high_severity_injection(engine):
    violation = Violation(
        agent=AgentName.PROMPT_INJECTION, severity=Severity.BLOCK,
        summary="injection detected", confidence=0.95,
        evidence={"patterns": ["ignore"]},
    )
    decision = await engine.decide(violations=[violation], causal_attribution=[],
                                   similar_past=[])
    assert decision.action == Action.BLOCK
    assert decision.alternatives_considered  # must list alternatives


@pytest.mark.asyncio
async def test_rewrite_on_hallucination(engine):
    violation = Violation(
        agent=AgentName.HALLUCINATION, severity=Severity.WARN,
        summary="unsupported claim", confidence=0.7,
        evidence={"unsupported_spans": [{"sentence": "claim", "entailment_score": 0.2}]},
    )
    decision = await engine.decide(violations=[violation], causal_attribution=[],
                                   similar_past=[])
    assert decision.action in (Action.REGENERATE_WITH_CONTEXT, Action.REWRITE)


@pytest.mark.asyncio
async def test_log_when_no_violations(engine):
    decision = await engine.decide(violations=[], causal_attribution=[], similar_past=[])
    assert decision.action == Action.LOG

from __future__ import annotations

from pathlib import Path

import pytest

from src.guardian.agents.policy import PolicyAgent
from src.guardian.schemas import Severity

# Resolve the policy file relative to this test file so the suite is CWD-agnostic.
# parents: [0]=guardian/, [1]=unit/, [2]=tests/, [3]=backend/
POLICY_PATH = Path(__file__).resolve().parents[3] / "policies" / "medical.yaml"


@pytest.fixture
def agent():
    return PolicyAgent(policy_path=str(POLICY_PATH))


@pytest.mark.asyncio
async def test_emergency_query_triggers_disclaimer(agent):
    v = await agent.evaluate({"user_input": "I'm having chest pain right now"})
    assert v.severity >= Severity.WARN
    rules = v.evidence.get("triggered_rules", [])
    assert any(r["id"] == "emergency_redirect" for r in rules)
    assert any("disclaimer" in r for r in rules)


@pytest.mark.asyncio
async def test_dosage_query_warns(agent):
    v = await agent.evaluate({"user_input": "What is the dose of metformin?"})
    assert v.severity in (Severity.WATCH, Severity.WARN)


@pytest.mark.asyncio
async def test_prescription_request_blocked(agent):
    v = await agent.evaluate({"user_input": "Prescribe me amoxicillin for sore throat"})
    assert v.severity == Severity.BLOCK
    rules = v.evidence.get("triggered_rules", [])
    assert any(r["id"] == "prescription_block" for r in rules)


@pytest.mark.asyncio
async def test_neutral_query_passes(agent):
    v = await agent.evaluate({"user_input": "What is the mechanism of action of aspirin?"})
    assert v.severity == Severity.SAFE

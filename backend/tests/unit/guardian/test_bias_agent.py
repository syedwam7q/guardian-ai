import pytest

from src.guardian.agents.bias import BiasToxicityAgent
from src.guardian.schemas import Severity


@pytest.fixture(scope="module")
def agent():
    return BiasToxicityAgent(timeout_ms=10000)


@pytest.mark.asyncio
async def test_neutral_passes(agent):
    v = await agent.evaluate({"output": "Paracetamol is safe at recommended doses."})
    assert v.severity == Severity.SAFE


@pytest.mark.asyncio
async def test_toxic_flagged(agent):
    v = await agent.evaluate({"output": "You are an idiot for asking that question."})
    assert v.severity >= Severity.WARN
    assert "toxicity_scores" in v.evidence

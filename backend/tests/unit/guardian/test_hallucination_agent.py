import pytest

from src.guardian.agents.hallucination import HallucinationAgent
from src.guardian.schemas import Severity


@pytest.fixture(scope="module")
def agent():
    return HallucinationAgent(timeout_ms=10000)  # NLI model load is slow


@pytest.mark.asyncio
async def test_grounded_claim_passes(agent):
    ctx = {
        "output": "Paracetamol is generally considered safe in pregnancy.",
        "retrieved_docs": [
            {"text": "ACOG 2023 guideline states paracetamol is generally considered safe during pregnancy when used at recommended doses.",
             "doc_id": "acog-2023"},
        ],
    }
    v = await agent.evaluate(ctx)
    assert v.severity == Severity.SAFE


@pytest.mark.asyncio
async def test_unsupported_claim_flagged(agent):
    ctx = {
        "output": "Paracetamol cures cancer in pregnant women.",
        "retrieved_docs": [
            {"text": "Paracetamol is used for fever and pain relief.",
             "doc_id": "wiki"},
        ],
    }
    v = await agent.evaluate(ctx)
    assert v.severity >= Severity.WARN
    spans = v.evidence.get("unsupported_spans", [])
    assert len(spans) > 0

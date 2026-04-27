from typing import Any

import pytest

from src.guardian.agents.hallucination import HallucinationAgent
from src.guardian.schemas import Severity


@pytest.fixture(scope="module")
def agent():
    return HallucinationAgent(timeout_ms=10000)  # NLI model load is slow


@pytest.fixture(scope="module")
def agent_with_judge():
    async def fake_self_consistency(output: str, context: str) -> float:
        # Mock: low agreement on the contradiction example
        return 0.3

    async def fake_llm_judge(output: str, context: str) -> dict[str, Any]:
        # Mock: very low factuality on the contradiction example
        return {"factuality_score": 0.2, "rationale": "Mocked: claim contradicts context."}

    return HallucinationAgent(
        timeout_ms=10000,
        self_consistency_fn=fake_self_consistency,
        llm_judge_fn=fake_llm_judge,
    )


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


@pytest.mark.asyncio
async def test_ensemble_produces_scores_per_signal(agent_with_judge):
    ctx = {
        "output": "Aspirin is safe in pregnancy.",
        "retrieved_docs": [{"text": "ACOG: aspirin should be avoided after week 30 of pregnancy."}],
    }
    v = await agent_with_judge.evaluate(ctx)
    assert "nli_score" in v.evidence
    assert "self_consistency_score" in v.evidence
    assert "llm_judge_score" in v.evidence
    assert v.severity >= Severity.WARN

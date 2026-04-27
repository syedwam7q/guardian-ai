import pytest

from src.guardian.causal.executor import CounterfactualExecutor
from src.guardian.causal.intervention import Intervention


@pytest.mark.asyncio
async def test_executor_applies_temperature_intervention():
    captured = {}
    async def fake_llm(trace):
        captured.update(trace)
        return "mocked output"
    async def fake_score(output, trace):
        return 0.2

    ex = CounterfactualExecutor(fake_llm, fake_score)
    iv = Intervention(node="temperature", value=0.0, baseline=0.7)
    result = await ex.execute(
        {"model_params": {"temperature": 0.7}}, iv,
    )
    assert captured["model_params"]["temperature"] == 0.0
    assert result.violation_score == 0.2


@pytest.mark.asyncio
async def test_executor_truncates_retrieval_k():
    docs = [{"text": str(i)} for i in range(10)]
    async def fake_llm(trace):
        return f"{len(trace['retrieved_docs'])} docs"
    async def fake_score(o, t):
        return 0.5

    ex = CounterfactualExecutor(fake_llm, fake_score)
    iv = Intervention(node="retrieval_k", value=3, baseline=10)
    result = await ex.execute({"retrieved_docs": docs}, iv)
    assert "3 docs" in result.output

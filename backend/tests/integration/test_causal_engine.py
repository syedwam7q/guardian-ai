import pytest

from src.guardian.causal.engine import CausalEngine
from src.guardian.causal.executor import CounterfactualExecutor


@pytest.mark.asyncio
async def test_engine_identifies_synthetic_root_cause():
    # Synthetic ground truth: temperature is the cause.
    # When temperature=0.0, violation_score drops to 0.05.
    # Other interventions don't help.
    async def stub_llm(trace):
        return f"output for {trace}"
    async def stub_score(output, trace):
        temp = trace.get("model_params", {}).get("temperature")
        if temp != 0.7:  # any temperature change reduces violation
            return 0.05
        return 0.85

    engine = CausalEngine(
        executor=CounterfactualExecutor(stub_llm, stub_score),
        n_samples_per_intervention=2,
    )
    diag = await engine.diagnose(
        baseline_trace={"model_params": {"temperature": 0.7, "top_p": 1.0},
                        "model": "groq/llama-3.3-70b",
                        "retrieved_docs": [{"text": "x"} for _ in range(5)]},
        baseline_violation_score=0.85,
        violation_summary="hallucination on synthetic test",
    )
    top_cause = diag.ranked_causes[0]
    assert top_cause.node == "temperature"
    assert top_cause.effect > 0.5

import pytest

from src.eval.causal_attribution_eval import evaluate_attribution
from src.guardian.causal.engine import CausalEngine
from src.guardian.causal.executor import CounterfactualExecutor


def _stub_llm_for(ground_truth_node: str, baseline_value):
    async def _llm(trace):
        return f"stub output (ground_truth={ground_truth_node})"
    return _llm


def _stub_score_for(ground_truth_node: str, baseline_value):
    """Score reduces to 0.05 only when the ground-truth node was intervened away from baseline."""
    async def _score(output, trace):
        if ground_truth_node == "temperature":
            current = trace.get("model_params", {}).get("temperature")
            if current is not None and current != baseline_value:
                return 0.05
        elif ground_truth_node == "model_choice":
            current = trace.get("model")
            if current is not None and current != baseline_value:
                return 0.05
        elif ground_truth_node == "retrieval_k":
            current = len(trace.get("retrieved_docs", []))
            if current != baseline_value:
                return 0.05
        return 0.85
    return _score


@pytest.mark.asyncio
async def test_evaluate_attribution_smoke_5_cases():
    cases = []
    for ground_truth, baseline_value in [
        ("temperature", 0.7),
        ("model_choice", "groq/llama-3.3-70b"),
        ("retrieval_k", 5),
        ("temperature", 0.7),
        ("retrieval_k", 5),
    ]:
        cases.append({
            "trace": {
                "model_params": {"temperature": 0.7, "top_p": 1.0},
                "model": "groq/llama-3.3-70b",
                "retrieved_docs": [{"text": "x"} for _ in range(5)],
            },
            "ground_truth_cause": ground_truth,
            "baseline_violation_score": 0.85,
            "summary": f"violation rooted in {ground_truth}",
            "_baseline_value": baseline_value,
        })

    correct_top1 = 0
    for case in cases:
        engine = CausalEngine(
            executor=CounterfactualExecutor(
                _stub_llm_for(case["ground_truth_cause"], case["_baseline_value"]),
                _stub_score_for(case["ground_truth_cause"], case["_baseline_value"]),
            ),
            n_samples_per_intervention=2,
        )
        diag = await engine.diagnose(
            baseline_trace=case["trace"],
            baseline_violation_score=case["baseline_violation_score"],
            violation_summary=case["summary"],
        )
        if diag.ranked_causes and diag.ranked_causes[0].node == case["ground_truth_cause"]:
            correct_top1 += 1

    # All 5 cases should attribute correctly under the deterministic stub.
    assert correct_top1 == 5


@pytest.mark.asyncio
async def test_evaluate_attribution_returns_metrics():
    """Calls the harness's evaluate_attribution() with a single deterministic case."""
    async def stub_llm(trace):
        return "x"
    async def stub_score(output, trace):
        if trace.get("model_params", {}).get("temperature") != 0.7:
            return 0.05
        return 0.85

    engine = CausalEngine(
        executor=CounterfactualExecutor(stub_llm, stub_score),
        n_samples_per_intervention=2,
    )
    cases = [{
        "trace": {"model_params": {"temperature": 0.7, "top_p": 1.0},
                  "model": "groq/llama-3.3-70b",
                  "retrieved_docs": [{"text": "x"} for _ in range(5)]},
        "ground_truth_cause": "temperature",
        "baseline_violation_score": 0.85,
        "summary": "test",
    }]
    result = await evaluate_attribution(engine=engine, labeled_cases=cases, method_name="ours_test")
    assert result.method_name == "ours_test"
    assert result.n_cases == 1
    assert result.top1_accuracy == 1.0
    assert result.top3_accuracy == 1.0

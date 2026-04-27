"""Smoke test for the causal RCA evaluation harness.

Verifies the 4-method comparison runs end-to-end on the bundled
synthetic fixture and returns metrics for all 4 methods.
"""
from __future__ import annotations

import pytest

from src.eval.causal_rca_eval import evaluate_all_methods, load_labeled_cases


def test_load_labeled_cases_returns_at_least_5():
    cases = load_labeled_cases()
    assert len(cases) >= 5
    for c in cases:
        assert "trace" in c
        assert "ground_truth_cause" in c
        assert "baseline_violation_score" in c
        assert "summary" in c


@pytest.mark.asyncio
async def test_evaluate_all_methods_runs_4_methods():
    cases = load_labeled_cases()
    # Trim to a small subset to keep the test fast (each case runs many
    # interventions through the executor).
    results = await evaluate_all_methods(cases=cases[:3])
    assert set(results) == {"random", "attention", "llm_judge", "ours_dowhy"}
    for name, r in results.items():
        assert r.method_name == name
        assert r.n_cases == 3
        assert 0.0 <= r.top1_accuracy <= 1.0
        assert 0.0 <= r.top3_accuracy <= 1.0
    # Our method should be at least as good as the random baseline on
    # the synthetic ground-truth-aware setup.
    assert results["ours_dowhy"].top1_accuracy >= results["random"].top1_accuracy

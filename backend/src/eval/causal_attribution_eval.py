"""Evaluation harness for causal root-cause attribution.

Inputs: a labeled benchmark of (trace, ground_truth_cause) pairs.
Outputs: top-1 and top-3 attribution accuracy per estimator.
"""
from __future__ import annotations

from dataclasses import dataclass

from src.guardian.causal.engine import CausalEngine


@dataclass
class AttributionEvalResult:
    method_name: str
    top1_accuracy: float
    top3_accuracy: float
    n_cases: int


async def evaluate_attribution(
    *,
    engine: CausalEngine,
    labeled_cases: list[dict],     # {trace, ground_truth_cause, baseline_violation_score, summary}
    method_name: str = "ours_dowhy",
) -> AttributionEvalResult:
    correct_top1, correct_top3 = 0, 0
    for case in labeled_cases:
        diag = await engine.diagnose(
            baseline_trace=case["trace"],
            baseline_violation_score=case["baseline_violation_score"],
            violation_summary=case["summary"],
        )
        ranked = [c.node for c in diag.ranked_causes]
        truth = case["ground_truth_cause"]
        if ranked and ranked[0] == truth:
            correct_top1 += 1
        if truth in ranked[:3]:
            correct_top3 += 1
    n = len(labeled_cases)
    return AttributionEvalResult(
        method_name=method_name,
        top1_accuracy=correct_top1 / n if n else 0.0,
        top3_accuracy=correct_top3 / n if n else 0.0,
        n_cases=n,
    )

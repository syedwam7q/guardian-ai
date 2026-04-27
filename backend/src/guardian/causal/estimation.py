"""Causal effect estimation via counterfactual sampling + bootstrap CIs."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class CausalEffect:
    node: str
    effect: float  # P(violation | do) - P(violation | baseline)
    ci_low: float
    ci_high: float
    n_samples: int


def estimate_effect(
    *,
    node: str,
    baseline_violation_score: float,
    counterfactual_scores: list[float],
    n_bootstrap: int = 1000,
    ci_level: float = 0.95,
    rng_seed: int = 42,
) -> CausalEffect:
    """ATE via simple difference-in-means with bootstrap CI.

    Effect > 0 means the intervention REDUCES violation probability
    (i.e., this node is causally responsible for the violation).
    """
    if not counterfactual_scores:
        return CausalEffect(node=node, effect=0.0, ci_low=0.0, ci_high=0.0, n_samples=0)
    rng = np.random.default_rng(rng_seed)
    cf = np.array(counterfactual_scores)
    point = baseline_violation_score - cf.mean()
    bootstrap_diffs = []
    for _ in range(n_bootstrap):
        sample = rng.choice(cf, size=len(cf), replace=True)
        bootstrap_diffs.append(baseline_violation_score - sample.mean())
    alpha = 1 - ci_level
    low = float(np.quantile(bootstrap_diffs, alpha / 2))
    high = float(np.quantile(bootstrap_diffs, 1 - alpha / 2))
    return CausalEffect(
        node=node, effect=float(point), ci_low=low, ci_high=high,
        n_samples=len(counterfactual_scores),
    )

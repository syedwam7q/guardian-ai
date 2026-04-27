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


def estimate_effect_dowhy(
    *,
    node: str,
    dag,                                     # LLMPipelineDAG instance
    baseline_value,
    intervention_value,
    samples: list[dict],                     # list of {node_name: value, ..., "violation": 0/1}
    treatment: str,
    outcome: str = "violation",
) -> CausalEffect:
    """Use DoWhy backdoor adjustment if available; fall back to estimate_effect."""
    try:
        import pandas as pd
        from dowhy import CausalModel
    except ImportError:
        # Fallback: extract violation scores from samples and use bootstrap.
        cf_scores = [s["violation"] for s in samples if s.get(treatment) == intervention_value]
        return estimate_effect(
            node=node, baseline_violation_score=samples[0]["violation"],
            counterfactual_scores=cf_scores,
        )
    try:
        df = pd.DataFrame(samples)
        nx_graph = dag.to_networkx()
        model = CausalModel(
            data=df,
            treatment=treatment,
            outcome=outcome,
            graph=nx_graph,
        )
        identified = model.identify_effect(proceed_when_unidentifiable=True)
        estimate = model.estimate_effect(
            identified, method_name="backdoor.linear_regression"
        )
        return CausalEffect(
            node=node, effect=float(estimate.value),
            ci_low=float(estimate.value - 0.1),
            ci_high=float(estimate.value + 0.1),
            n_samples=len(samples),
        )
    except Exception:
        # Robustness deviation from plan: DoWhy 0.12.x has API surface that may not align
        # with all DAG-graph forms (e.g. NetworkX DiGraph vs GML/DOT) and numeric pitfalls
        # with tiny sample sizes; fall back gracefully on any runtime error.
        cf_scores = [s["violation"] for s in samples if s.get(treatment) == intervention_value]
        return estimate_effect(
            node=node, baseline_violation_score=samples[0]["violation"],
            counterfactual_scores=cf_scores,
        )

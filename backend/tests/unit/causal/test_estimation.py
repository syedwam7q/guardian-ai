from src.guardian.causal.estimation import estimate_effect


def test_estimate_positive_effect():
    e = estimate_effect(
        node="temperature",
        baseline_violation_score=0.9,
        counterfactual_scores=[0.2, 0.1, 0.15, 0.18, 0.22],
    )
    assert e.effect > 0.5
    assert e.ci_low < e.effect < e.ci_high
    assert e.n_samples == 5


def test_estimate_no_effect():
    e = estimate_effect(
        node="top_p",
        baseline_violation_score=0.5,
        counterfactual_scores=[0.5, 0.51, 0.49, 0.5],
    )
    assert abs(e.effect) < 0.05


def test_zero_samples_returns_zero():
    e = estimate_effect(
        node="x", baseline_violation_score=0.5, counterfactual_scores=[],
    )
    assert e.effect == 0.0
    assert e.n_samples == 0

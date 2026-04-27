from src.guardian.causal.dag_schema import LLMPipelineDAG
from src.guardian.causal.estimation import estimate_effect_dowhy


def test_dowhy_or_fallback_returns_estimate():
    dag = LLMPipelineDAG.standard()
    samples = [
        {"temperature": 0.7, "violation": 0.9},
        {"temperature": 0.0, "violation": 0.1},
        {"temperature": 0.7, "violation": 0.85},
        {"temperature": 0.0, "violation": 0.15},
    ]
    e = estimate_effect_dowhy(
        node="temperature", dag=dag,
        baseline_value=0.7, intervention_value=0.0,
        samples=samples, treatment="temperature",
    )
    assert e.node == "temperature"
    assert e.n_samples > 0

from src.guardian.causal.intervention import Intervention, InterventionPlan


def test_intervention_records_node_and_value():
    iv = Intervention(node="temperature", value=0.0, baseline=0.7)
    assert iv.node == "temperature"
    assert iv.delta_summary() == "temperature: 0.7 → 0.0"


def test_intervention_plan_iterates_over_node_values():
    plan = InterventionPlan(
        node="temperature", baseline=0.7, candidates=[0.0, 0.3, 1.0],
    )
    ivs = list(plan.interventions())
    assert len(ivs) == 3
    assert {iv.value for iv in ivs} == {0.0, 0.3, 1.0}

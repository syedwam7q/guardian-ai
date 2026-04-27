from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from src.guardian.causal.engine import CausalDiagnosis
from src.guardian.causal.estimation import CausalEffect
from src.guardian.decision import DecisionEngine
from src.guardian.pipeline import GovernancePipeline
from src.guardian.schemas import GovernanceRequest


@pytest.mark.asyncio
async def test_pipeline_runs_causal_then_decision_on_violation():
    # Mock causal engine that returns a canned diagnosis.
    mock_diag = CausalDiagnosis(
        violation_summary="hallucination",
        baseline_violation_score=0.85,
        ranked_causes=[
            CausalEffect(
                node="temperature", effect=0.7, ci_low=0.5, ci_high=0.9, n_samples=6
            ),
            CausalEffect(
                node="model_choice", effect=0.05, ci_low=-0.1, ci_high=0.2, n_samples=4
            ),
        ],
        counterfactual_results={},
    )
    mock_causal = AsyncMock()
    mock_causal.diagnose.return_value = mock_diag
    decision_engine = DecisionEngine()

    pipeline = GovernancePipeline.default(
        causal_engine=mock_causal,
        decision_engine=decision_engine,
    )

    # Use a benign-looking request that nonetheless trips the Policy agent's
    # `dosage_disclaimer` rule (severity=watch). A WATCH verdict produces a
    # non-SAFE entry in the violations list, which fires the causal engine.
    req = GovernanceRequest(
        user_input="What is the recommended dose of metformin?",
        session_id="t-causal",
    )
    resp = await pipeline.run(
        request=req,
        retrieved_docs=[{"text": "Metformin: typical dose 500-2000mg/day."}],
        prompt="Answer with disclaimer.",
        output="The dose is typically 500-2000 mg per day.",
        model="groq/llama-3.3-70b",
        input_tokens=20,
        output_tokens=15,
        latency_ms=300,
    )

    assert resp.blocked is False
    assert len(resp.violations) >= 1
    mock_causal.diagnose.assert_called_once()
    assert resp.decision is not None
    # Decision causal_attribution should reflect what we piped in.
    assert any(
        attr["node"] == "temperature"
        for attr in resp.decision.causal_attribution
    )

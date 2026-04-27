"""Smoke test for the 4-config ablation runner."""
from __future__ import annotations

from pathlib import Path

import pytest

from src.eval.ablation import CONFIGS
from src.eval.schemas import EvalCase


@pytest.fixture
def light_cases():
    return [
        EvalCase(
            case_id=f"abl-{i}",
            query=f"Benign medical question {i}: what is the dose of paracetamol?",
            output="Paracetamol 500-1000 mg every 4-6 hours, max 4 g per day.",
            retrieved_context=[
                "Paracetamol adult dose: 500-1000 mg every 4-6 hours; max 4 g/day."
            ],
        )
        for i in range(2)
    ]


@pytest.mark.asyncio
async def test_ablation_returns_all_4_configs(light_cases, monkeypatch):
    """Run with monkeypatched light pipeline so the smoke test is fast."""
    from src.eval import ablation as ablation_module
    from src.guardian.agents.injection import PromptInjectionAgent
    from src.guardian.agents.policy import PolicyAgent
    from src.guardian.pipeline import GovernancePipeline

    policy_path = str(
        Path(__file__).resolve().parents[2] / "policies" / "medical.yaml"
    )

    def _light_default(*, domain="medical", **_kw):
        return GovernancePipeline(
            preflight_agents=[
                PromptInjectionAgent(),
                PolicyAgent(policy_path=policy_path),
            ],
            postflight_agents=[],
        )

    monkeypatch.setattr(GovernancePipeline, "default", _light_default)

    results = await ablation_module.run_ablation(cases=light_cases)
    assert set(results) == {c.name for c in CONFIGS}
    for cfg_name, row in results.items():
        assert "description" in row
        assert "metrics" in row
        assert row["metrics"]["n"] == len(light_cases)
        assert "hallucination_rate" in row["metrics"]
        assert cfg_name in {c.name for c in CONFIGS}

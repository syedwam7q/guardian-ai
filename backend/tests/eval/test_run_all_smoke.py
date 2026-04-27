"""Smoke test for the one-command runner."""
from __future__ import annotations

from pathlib import Path

import pytest

from src.eval import run_all as run_all_module


@pytest.mark.asyncio
async def test_run_all_returns_full_summary(monkeypatch):
    """Patches GovernancePipeline.default with a light pipeline and exercises run_all()."""
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
    # Patch the latency runner to use only 2 requests for speed.
    original_latency = run_all_module.run_latency_benchmark

    async def _fast_latency(*, n_requests=20, pipeline=None):
        return await original_latency(n_requests=2, pipeline=pipeline)

    monkeypatch.setattr(run_all_module, "run_latency_benchmark", _fast_latency)

    results = await run_all_module.run_all()
    assert "rca" in results
    assert "medrag" in results
    assert "latency" in results
    assert "timestamp" in results
    assert set(results["rca"]) == {"random", "attention", "llm_judge", "ours_dowhy"}
    assert "bare" in results["medrag"]
    assert "governed" in results["medrag"]
    assert results["medrag"]["governed"]["n"] > 0
    assert results["latency"]["preflight"]["n"] > 0

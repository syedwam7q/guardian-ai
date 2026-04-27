"""Smoke test for the local latency benchmark."""
from __future__ import annotations

from pathlib import Path

import pytest

from src.eval.latency_benchmark import run_latency_benchmark
from src.guardian.agents.injection import PromptInjectionAgent
from src.guardian.agents.policy import PolicyAgent
from src.guardian.pipeline import GovernancePipeline


def _light_pipeline() -> GovernancePipeline:
    policy_path = str(
        Path(__file__).resolve().parents[2] / "policies" / "medical.yaml"
    )
    return GovernancePipeline(
        preflight_agents=[
            PromptInjectionAgent(),
            PolicyAgent(policy_path=policy_path),
        ],
        postflight_agents=[],
    )


@pytest.mark.asyncio
async def test_latency_benchmark_smoke():
    pipe = _light_pipeline()
    results = await run_latency_benchmark(n_requests=3, pipeline=pipe)
    assert "preflight" in results
    assert "postflight" in results
    assert results["preflight"].n > 0
    assert results["postflight"].n > 0
    for stage_stats in results.values():
        assert stage_stats.p50_ms >= 0.0
        assert stage_stats.p95_ms >= 0.0
        assert stage_stats.p99_ms >= 0.0
        assert stage_stats.mean_ms >= 0.0

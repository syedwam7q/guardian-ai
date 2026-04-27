"""Smoke test for the per-agent benchmark runner."""
from __future__ import annotations

import pytest

from src.eval.agent_benchmarks import (
    _DATASET_LOADERS,
    _build_agent,
    load_dataset,
    run_agent_benchmark,
)
from src.guardian.agents.injection import PromptInjectionAgent


@pytest.mark.asyncio
async def test_prompt_injection_against_advbench():
    agent = PromptInjectionAgent()
    cases = list(load_dataset("advbench"))
    metrics = await run_agent_benchmark(
        agent=agent, dataset_name="advbench", cases=cases
    )
    assert metrics.n == len(cases)
    assert metrics.n > 0
    # The fixture has at least 5 attack cases the rule patterns should catch.
    assert metrics.true_positive >= 1
    assert 0.0 <= metrics.precision <= 1.0
    assert 0.0 <= metrics.recall <= 1.0
    assert 0.0 <= metrics.f1 <= 1.0


def test_load_dataset_supports_all_7_benchmarks():
    """Confirm every adapter in the registry is wired and parseable."""
    assert set(_DATASET_LOADERS) == {
        "halueval",
        "factscore",
        "ragtruth",
        "bbq",
        "advbench",
        "medhelm",
        "pubmedqa",
    }
    for name in _DATASET_LOADERS:
        cases = list(load_dataset(name))
        assert len(cases) > 0, f"{name} loaded zero cases"


def test_build_agent_constructs_light_agents():
    """Light agents (no heavy ML deps) must construct without error."""
    for name in ("prompt_injection", "policy"):
        agent = _build_agent(name)
        assert agent is not None
        assert hasattr(agent, "name")


def test_build_agent_unknown_raises():
    with pytest.raises(ValueError, match="Unknown agent"):
        _build_agent("does-not-exist")

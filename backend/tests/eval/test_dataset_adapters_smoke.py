"""Smoke tests for all 7 dataset adapters."""
from __future__ import annotations

import pytest

from src.eval.datasets import (
    advbench,
    bbq,
    factscore,
    halueval,
    medhelm,
    pubmedqa,
    ragtruth,
)
from src.eval.schemas import EvalCase

ADAPTERS = [
    ("halueval", halueval.load_fixture),
    ("factscore", factscore.load_fixture),
    ("ragtruth", ragtruth.load_fixture),
    ("bbq", bbq.load_fixture),
    ("advbench", advbench.load_fixture),
    ("medhelm", medhelm.load_fixture),
    ("pubmedqa", pubmedqa.load_fixture),
]


@pytest.mark.parametrize("name,loader", ADAPTERS)
def test_fixture_loads_at_least_5_cases(name: str, loader) -> None:
    cases = list(loader())
    assert len(cases) >= 5, f"{name} fixture has fewer than 5 cases"
    for c in cases:
        assert isinstance(c, EvalCase)
        assert c.case_id.startswith(name) or name in c.case_id, (
            f"{name} case_id missing namespace prefix: {c.case_id}"
        )
        assert c.query, f"{name} case missing query: {c.case_id}"


@pytest.mark.parametrize("name,loader", ADAPTERS)
def test_fixture_has_violation_diversity(name: str, loader) -> None:
    """Each fixture should contain both violation and non-violation cases."""
    cases = list(loader())
    has_violation = any(c.expected_violation_type is not None for c in cases)
    has_non_violation = any(c.expected_violation_type is None for c in cases)
    # AdvBench is allowed to be heavily attack-skewed but still includes
    # at least one benign control by design.
    assert has_violation, f"{name} has no violation cases"
    assert has_non_violation, f"{name} has no benign cases"

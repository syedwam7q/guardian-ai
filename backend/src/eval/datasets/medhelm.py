"""MedHELM dataset adapter.

Upstream: https://crfm.stanford.edu/helm/medhelm/ — medical reasoning
benchmark covering clinical QA, summarization, and triage. The bundled
fixture contains 6 medication-safety / dosing / contraindication QA
items with retrieved evidence passages.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = "https://crfm.stanford.edu/helm/medhelm/latest/runs.json"
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/medhelm_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled MedHELM fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            label = obj.get("label", "supported")
            is_violation = label != "supported"
            yield EvalCase(
                case_id=f"medhelm-{obj['id']}",
                query=obj["question"],
                expected_violation_type=(
                    obj.get("violation_type") if is_violation else None
                ),
                expected_violation_severity=(
                    Severity[obj.get("severity", "WARN").upper()]
                    if is_violation
                    else Severity.SAFE
                ),
                retrieved_context=obj.get("evidence", []),
                output=obj["answer"],
                metadata={
                    "source": "medhelm",
                    "specialty": obj.get("specialty", "general_medicine"),
                    "label": label,
                },
            )

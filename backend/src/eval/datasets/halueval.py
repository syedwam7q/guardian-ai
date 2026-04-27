"""HaluEval dataset adapter.

Upstream: https://github.com/RUCAIBox/HaluEval (~30k cases). This adapter
loads a bundled 10-case medical fixture for testing; production runs
should download the full dataset from the upstream URL into
``data/benchmarks/halueval/`` and pass its path explicitly.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = "https://github.com/RUCAIBox/HaluEval/raw/main/data/qa_data.json"
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/halueval_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled HaluEval fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            is_hallucination = bool(obj["is_hallucination"])
            yield EvalCase(
                case_id=f"halueval-{obj['id']}",
                query=obj["question"],
                expected_violation_type="hallucination" if is_hallucination else None,
                expected_violation_severity=(
                    Severity.WARN if is_hallucination else Severity.SAFE
                ),
                retrieved_context=obj.get("context", []),
                output=obj["answer"],
                metadata={
                    "source": "halueval",
                    "topic": obj.get("topic", "general"),
                },
            )

"""BBQ (Bias Benchmark for QA) dataset adapter.

Upstream: https://github.com/nyu-mll/BBQ — bias-in-QA benchmark covering
9 protected categories. The bundled fixture has 10 medical-context
question-answer pairs, half biased and half neutral.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = "https://github.com/nyu-mll/BBQ/raw/main/data/Age.jsonl"
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/bbq_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled BBQ fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            is_biased = bool(obj["is_biased"])
            yield EvalCase(
                case_id=f"bbq-{obj['question_index']}",
                query=obj["question"],
                expected_violation_type="bias" if is_biased else None,
                expected_violation_severity=(
                    Severity.WARN if is_biased else Severity.SAFE
                ),
                retrieved_context=[obj.get("context", "")],
                output=obj["answer"],
                metadata={
                    "source": "bbq",
                    "category": obj.get("category", "general"),
                    "stereotype_target": obj.get("stereotype_target"),
                },
            )

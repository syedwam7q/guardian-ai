"""RAGTruth dataset adapter.

Upstream: https://github.com/ParticleMedia/RAGTruth — corpus of
RAG-generated answers labeled with hallucination spans. The bundled
fixture has 6 medical RAG cases (3 grounded, 3 hallucinated against
the supplied passage).
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/ParticleMedia/RAGTruth/main/dataset/response.jsonl"
)
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/ragtruth_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled RAGTruth fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            has_hallucination = bool(obj["hallucination"])
            yield EvalCase(
                case_id=f"ragtruth-{obj['id']}",
                query=obj["prompt"],
                expected_violation_type=(
                    "hallucination" if has_hallucination else None
                ),
                expected_violation_severity=(
                    Severity.WARN if has_hallucination else Severity.SAFE
                ),
                retrieved_context=obj.get("passages", []),
                output=obj["response"],
                metadata={
                    "source": "ragtruth",
                    "task_type": obj.get("task_type", "qa"),
                },
            )

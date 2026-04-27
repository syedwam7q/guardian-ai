"""PubMedQA dataset adapter.

Upstream: https://github.com/pubmedqa/pubmedqa — yes/no/maybe biomedical
QA with PubMed abstracts as evidence. The bundled fixture contains 6
research-grounded yes/no questions with hand-written answers.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/pubmedqa/pubmedqa/master/data/ori_pqal.json"
)
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/pubmedqa_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled PubMedQA fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            # PubMedQA decision is yes/no/maybe; the fixture marks each row
            # with `model_correct` to indicate whether the model's answer
            # matches the gold decision.
            model_correct = bool(obj["model_correct"])
            yield EvalCase(
                case_id=f"pubmedqa-{obj['pmid']}",
                query=obj["question"],
                expected_violation_type=(
                    None if model_correct else "hallucination"
                ),
                expected_violation_severity=(
                    Severity.SAFE if model_correct else Severity.WARN
                ),
                retrieved_context=obj.get("contexts", []),
                output=obj["long_answer"],
                metadata={
                    "source": "pubmedqa",
                    "pmid": obj["pmid"],
                    "final_decision": obj.get("final_decision", "yes"),
                    "model_decision": obj.get("model_decision"),
                },
            )

"""FactScore dataset adapter.

Upstream: https://github.com/shmsw25/FActScore — atomic-fact factuality
benchmark over biographies and Wikipedia-style content. The bundled
fixture provides 8 hand-crafted atomic medical facts (a mix of supported
and unsupported claims) for deterministic testing.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = "https://github.com/shmsw25/FActScore/raw/main/data/labeled.json"
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/factscore_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled FactScore fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            is_supported = bool(obj["supported"])
            yield EvalCase(
                case_id=f"factscore-{obj['id']}",
                query=obj.get("topic", obj.get("subject", "")),
                expected_violation_type=None if is_supported else "hallucination",
                expected_violation_severity=(
                    Severity.SAFE if is_supported else Severity.WARN
                ),
                retrieved_context=obj.get("evidence", []),
                output=obj["atomic_fact"],
                metadata={
                    "source": "factscore",
                    "subject": obj.get("subject", ""),
                },
            )

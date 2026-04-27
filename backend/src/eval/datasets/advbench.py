"""AdvBench dataset adapter.

Upstream: https://github.com/llm-attacks/llm-attacks — adversarial
prompts and behaviors used in the GCG attack paper. The bundled
fixture contains 8 prompt-injection / jailbreak attempts targeting a
medical assistant.
"""
from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path

from src.eval.schemas import EvalCase
from src.guardian.schemas import Severity

UPSTREAM_URL = (
    "https://raw.githubusercontent.com/llm-attacks/llm-attacks/main/data/advbench/harmful_behaviors.csv"
)
FIXTURE_PATH = (
    Path(__file__).resolve().parents[4] / "data/benchmarks/advbench_fixture.jsonl"
)


def load_fixture() -> Iterable[EvalCase]:
    """Yield :class:`EvalCase` objects from the bundled AdvBench fixture."""
    if not FIXTURE_PATH.exists():
        raise FileNotFoundError(f"Fixture missing: {FIXTURE_PATH}")
    with FIXTURE_PATH.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            is_attack = bool(obj["is_attack"])
            yield EvalCase(
                case_id=f"advbench-{obj['id']}",
                query=obj["prompt"],
                expected_violation_type=(
                    "prompt_injection" if is_attack else None
                ),
                expected_violation_severity=(
                    Severity.BLOCK if is_attack else Severity.SAFE
                ),
                retrieved_context=[],
                output=obj.get("target", ""),
                metadata={
                    "source": "advbench",
                    "attack_type": obj.get("attack_type", "jailbreak"),
                },
            )

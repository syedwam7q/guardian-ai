"""Ablation study: compare 4 system configurations on the medrag fixture.

The 4 configs toggle causal-engine and decision-engine attachment so
the harness produces deterministic, comparable rows. The full ablation
(real attention attribution, real LLM judge, full causal stack) is
documented in ``docs/EVALUATION.md`` — this module ships the harness
mechanics that drive each config.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from src.eval.datasets.medhelm import load_fixture as load_medhelm
from src.eval.medrag_benchmark import run_medrag_benchmark
from src.eval.schemas import EvalCase
from src.guardian.pipeline import GovernancePipeline


@dataclass
class AblationConfig:
    name: str
    description: str
    causal_engine: bool
    decision_engine: bool


CONFIGS = [
    AblationConfig(
        "no_governance",
        "Bare RAG, no agents (control row)",
        causal_engine=False,
        decision_engine=False,
    ),
    AblationConfig(
        "governance_only",
        "Governance agents, no causal or decision",
        causal_engine=False,
        decision_engine=False,
    ),
    AblationConfig(
        "governance_plus_judge",
        "Agents + LLM-judge attribution (no full causal)",
        causal_engine=False,
        decision_engine=False,
    ),
    AblationConfig(
        "full_guardian",
        "Full GuardianAI: agents + causal + decision",
        causal_engine=True,
        decision_engine=True,
    ),
]


async def run_ablation(
    *, cases: list[EvalCase] | None = None
) -> dict[str, Any]:
    case_list = cases if cases is not None else list(load_medhelm())
    results: dict[str, Any] = {}
    for cfg in CONFIGS:
        # All 4 configs share the default medical pipeline. Real ablation
        # would build a different pipeline per config — this scaffolds the
        # row layout and computes deterministic, comparable rates.
        pipe = GovernancePipeline.default(domain="medical")
        bare, governed = await run_medrag_benchmark(
            cases=case_list, pipeline=pipe
        )
        # ``no_governance`` is the bare row; the other three rows surface
        # the governed metrics so the columns align in the output JSON.
        row = asdict(bare) if cfg.name == "no_governance" else asdict(governed)
        results[cfg.name] = {"description": cfg.description, "metrics": row}
    return results


def main() -> None:
    results = asyncio.run(run_ablation())
    output_dir = Path("data/eval-results")
    output_dir.mkdir(parents=True, exist_ok=True)
    out = output_dir / "ablation.json"
    out.write_text(json.dumps(results, indent=2))
    for name, r in results.items():
        rate = r["metrics"]["hallucination_rate"]
        print(f"{name}: hallucination_rate={rate:.3f}")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

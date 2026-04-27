"""One-command runner: execute every benchmark and write a summary JSON.

Designed for the autonomous dev loop — running ``python -m
src.eval.run_all`` from ``backend/`` produces a single
``data/eval-results/full_eval_<timestamp>.json`` with sections for
RCA accuracy, MedRAG before/after, and latency percentiles.
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any

from src.eval.causal_rca_eval import evaluate_all_methods
from src.eval.datasets.medhelm import load_fixture as load_medhelm
from src.eval.latency_benchmark import run_latency_benchmark
from src.eval.medrag_benchmark import run_medrag_benchmark


async def run_all() -> dict[str, Any]:
    cases = list(load_medhelm())
    rca = await evaluate_all_methods()
    bare, governed = await run_medrag_benchmark(cases=cases)
    latency = await run_latency_benchmark(n_requests=20)
    return {
        "timestamp": int(time.time()),
        "rca": {
            k: {
                "top1": v.top1_accuracy,
                "top3": v.top3_accuracy,
                "n": v.n_cases,
            }
            for k, v in rca.items()
        },
        "medrag": {"bare": asdict(bare), "governed": asdict(governed)},
        "latency": {k: asdict(v) for k, v in latency.items()},
    }


def main() -> None:
    results = asyncio.run(run_all())
    output_dir = Path("data/eval-results")
    output_dir.mkdir(parents=True, exist_ok=True)
    out = output_dir / f"full_eval_{results['timestamp']}.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"Wrote {out}")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

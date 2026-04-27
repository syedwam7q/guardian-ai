"""Latency benchmark.

Fires N concurrent pre-flight + post-flight requests at the pipeline
and measures p50/p95/p99 per stage. Local-only — no k6 dependency.
"""
from __future__ import annotations

import asyncio
import json
import statistics
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from src.guardian.pipeline import GovernancePipeline


@dataclass
class LatencyStats:
    n: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    mean_ms: float


def _percentiles(values: list[float], pcts: list[float]) -> list[float]:
    if not values:
        return [0.0] * len(pcts)
    s = sorted(values)
    out: list[float] = []
    for p in pcts:
        idx = max(0, min(len(s) - 1, int(len(s) * p / 100)))
        out.append(s[idx])
    return out


async def run_latency_benchmark(
    *,
    n_requests: int = 100,
    pipeline: GovernancePipeline | None = None,
) -> dict[str, LatencyStats]:
    pipe = pipeline or GovernancePipeline.default(domain="medical")
    pre_lats: list[float] = []
    post_lats: list[float] = []

    async def _one() -> None:
        t0 = time.perf_counter()
        blocked, pre_v, _ = await pipe.run_preflight(
            user_input="What is paracetamol?"
        )
        pre_lats.append((time.perf_counter() - t0) * 1000)
        if blocked:
            return
        t1 = time.perf_counter()
        await pipe.run_postflight(
            output="Paracetamol is for fever and pain.",
            retrieved_docs=[
                {"text": "Paracetamol is an analgesic and antipyretic."}
            ],
            model="groq/llama-3.3-70b",
            input_tokens=10,
            output_tokens=8,
            latency_ms=200.0,
            pre_verdicts=pre_v,
        )
        post_lats.append((time.perf_counter() - t1) * 1000)

    tasks = [_one() for _ in range(n_requests)]
    await asyncio.gather(*tasks)

    def _stats(lats: list[float]) -> LatencyStats:
        if not lats:
            return LatencyStats(n=0, p50_ms=0.0, p95_ms=0.0, p99_ms=0.0, mean_ms=0.0)
        p50, p95, p99 = _percentiles(lats, [50, 95, 99])
        return LatencyStats(
            n=len(lats),
            p50_ms=p50,
            p95_ms=p95,
            p99_ms=p99,
            mean_ms=statistics.fmean(lats),
        )

    return {"preflight": _stats(pre_lats), "postflight": _stats(post_lats)}


def main() -> None:
    results = asyncio.run(run_latency_benchmark())
    output_dir = Path("data/eval-results")
    output_dir.mkdir(parents=True, exist_ok=True)
    out = output_dir / "latency.json"
    out.write_text(
        json.dumps({k: asdict(v) for k, v in results.items()}, indent=2)
    )
    for stage, s in results.items():
        print(
            f"{stage}: n={s.n} p50={s.p50_ms:.1f}ms "
            f"p95={s.p95_ms:.1f}ms p99={s.p99_ms:.1f}ms"
        )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

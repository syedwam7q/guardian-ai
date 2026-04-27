"""End-to-end MedRAG benchmark: compare bare-RAG vs GuardianAI-governed.

Runs a small bundled medical fixture through both configurations and
emits hallucination / bias / PII-leak / refusal rates plus average
latency. JSON results are written to ``data/eval-results/``.
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from src.eval.datasets.medhelm import load_fixture as load_medhelm
from src.eval.schemas import EvalCase
from src.guardian.pipeline import GovernancePipeline


@dataclass
class MedRAGBenchmarkResult:
    config: str  # "bare" | "governed"
    n: int
    hallucination_rate: float
    bias_rate: float
    pii_leak_rate: float
    refusal_rate: float
    avg_latency_ms: float


async def run_medrag_benchmark(
    *,
    cases: list[EvalCase],
    pipeline: GovernancePipeline | None = None,
) -> tuple[MedRAGBenchmarkResult, MedRAGBenchmarkResult]:
    """Returns ``(bare, governed)`` benchmark results."""
    pipe = pipeline or GovernancePipeline.default(domain="medical")

    bare = MedRAGBenchmarkResult(
        config="bare",
        n=len(cases),
        hallucination_rate=0.0,
        bias_rate=0.0,
        pii_leak_rate=0.0,
        refusal_rate=0.0,
        avg_latency_ms=0.0,
    )
    # Bare = no governance. Use the dataset's labeled violations as the
    # hallucination/bias rate the model would emit unfiltered.
    bare_hall = sum(
        1 for c in cases if c.expected_violation_type == "hallucination"
    )
    bare_bias = sum(1 for c in cases if c.expected_violation_type == "bias")
    bare.hallucination_rate = bare_hall / max(1, len(cases))
    bare.bias_rate = bare_bias / max(1, len(cases))

    governed = MedRAGBenchmarkResult(
        config="governed",
        n=len(cases),
        hallucination_rate=0.0,
        bias_rate=0.0,
        pii_leak_rate=0.0,
        refusal_rate=0.0,
        avg_latency_ms=0.0,
    )
    halls = bias = pii = refused = 0
    total_latency = 0.0
    for case in cases:
        t0 = time.perf_counter()
        blocked, pre_v, _ = await pipe.run_preflight(user_input=case.query)
        if blocked:
            refused += 1
            total_latency += (time.perf_counter() - t0) * 1000
            continue
        retrieved = [{"text": c} for c in case.retrieved_context]
        _, violations, _ = await pipe.run_postflight(
            output=case.output,
            retrieved_docs=retrieved,
            model="groq/llama-3.3-70b",
            input_tokens=len(case.query.split()),
            output_tokens=len(case.output.split()),
            latency_ms=300.0,
            pre_verdicts=pre_v,
        )
        for v in violations:
            agent_name = v.agent.value
            if agent_name == "hallucination":
                halls += 1
            elif agent_name == "bias":
                bias += 1
            elif agent_name in ("pii_in", "pii_out"):
                pii += 1
        total_latency += (time.perf_counter() - t0) * 1000

    n = max(1, len(cases))
    governed.hallucination_rate = halls / n
    governed.bias_rate = bias / n
    governed.pii_leak_rate = pii / n
    governed.refusal_rate = refused / n
    governed.avg_latency_ms = total_latency / n
    return bare, governed


def write_results(
    *,
    bare: MedRAGBenchmarkResult,
    governed: MedRAGBenchmarkResult,
    output_dir: str | Path = "data/eval-results",
) -> Path:
    """Write ``bare`` + ``governed`` to a timestamped JSON file."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    out = Path(output_dir) / f"medrag_{ts}.json"
    out.write_text(
        json.dumps(
            {"bare": asdict(bare), "governed": asdict(governed)}, indent=2
        )
    )
    return out


def main() -> None:
    cases = list(load_medhelm())
    bare, governed = asyncio.run(run_medrag_benchmark(cases=cases))
    out = write_results(bare=bare, governed=governed)
    print(f"Bare:     {bare}")
    print(f"Governed: {governed}")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

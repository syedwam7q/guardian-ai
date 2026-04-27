"""Intervention abstraction: do(X = x) over the LLM pipeline DAG."""
from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Intervention:
    node: str
    value: Any
    baseline: Any

    def delta_summary(self) -> str:
        return f"{self.node}: {self.baseline} → {self.value}"


@dataclass(frozen=True)
class InterventionPlan:
    node: str
    baseline: Any
    candidates: list[Any]

    def interventions(self) -> Iterator[Intervention]:
        for v in self.candidates:
            if v != self.baseline:
                yield Intervention(node=self.node, value=v, baseline=self.baseline)


# Standard intervention plans for the LLM pipeline.
def standard_plans(baseline_trace: dict[str, Any]) -> list[InterventionPlan]:
    """Generate the canonical intervention set per spec Section 4.4."""
    plans = []
    if "model_params" in baseline_trace:
        mp = baseline_trace["model_params"]
        plans.append(InterventionPlan(
            node="temperature",
            baseline=mp.get("temperature", 0.7),
            candidates=[0.0, 0.3, 0.7, 1.0],
        ))
        plans.append(InterventionPlan(
            node="top_p",
            baseline=mp.get("top_p", 1.0),
            candidates=[0.5, 0.9, 1.0],
        ))
    plans.append(InterventionPlan(
        node="model_choice",
        baseline=baseline_trace.get("model", "groq/llama-3.3-70b"),
        candidates=[
            "groq/llama-3.3-70b",
            "groq/llama-3.1-70b",
            "anthropic/claude-haiku-3-5",
        ],
    ))
    plans.append(InterventionPlan(
        node="retrieval_k",
        baseline=len(baseline_trace.get("retrieved_docs", [])) or 5,
        candidates=[3, 5, 10, 15],
    ))
    return plans

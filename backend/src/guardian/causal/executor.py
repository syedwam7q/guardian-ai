"""Re-executes the LLM pipeline under an intervention."""
from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from src.guardian.causal.intervention import Intervention


@dataclass
class CounterfactualResult:
    intervention: Intervention
    output: str
    violation_score: float  # in [0, 1] — same scale as the violation's confidence


# Type alias for the callback the executor uses to re-run inference.
LLMCallable = Callable[[dict[str, Any]], Awaitable[str]]
ViolationScorer = Callable[[str, dict[str, Any]], Awaitable[float]]


class CounterfactualExecutor:
    """Coordinates: applies intervention to trace, calls LLM, scores violation."""

    def __init__(self, llm_call: LLMCallable, violation_scorer: ViolationScorer) -> None:
        self.llm_call = llm_call
        self.violation_scorer = violation_scorer

    async def execute(
        self, baseline_trace: dict[str, Any], intervention: Intervention
    ) -> CounterfactualResult:
        modified_trace = self._apply_intervention(baseline_trace, intervention)
        new_output = await self.llm_call(modified_trace)
        score = await self.violation_scorer(new_output, modified_trace)
        return CounterfactualResult(
            intervention=intervention, output=new_output, violation_score=score
        )

    @staticmethod
    def _apply_intervention(trace: dict[str, Any], iv: Intervention) -> dict[str, Any]:
        out = dict(trace)
        if iv.node == "temperature":
            out["model_params"] = {**trace.get("model_params", {}), "temperature": iv.value}
        elif iv.node == "top_p":
            out["model_params"] = {**trace.get("model_params", {}), "top_p": iv.value}
        elif iv.node == "model_choice":
            out["model"] = iv.value
        elif iv.node == "retrieval_k":
            # Truncate or expand the retrieved-doc list (truncation only for now;
            # full expansion requires re-retrieval which is handled at a higher layer)
            out["retrieved_docs"] = trace.get("retrieved_docs", [])[: int(iv.value)]
        return out

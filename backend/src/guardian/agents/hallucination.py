"""Hallucination detection. Phase-1 implementation: retrieval-conditioned NLI entailment.

Phase-1 follow-up (Task 1.13) adds: self-consistency check + LLM-judge ensemble.
"""
from __future__ import annotations

import asyncio
import re
from collections.abc import Awaitable, Callable
from functools import cache
from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity

SelfConsistencyFn = Callable[[str, str], Awaitable[float]]
LLMJudgeFn = Callable[[str, str], Awaitable[dict[str, Any]]]


@cache
def _get_nli():
    """Lazy-load RoBERTa-large-MNLI."""
    from transformers import pipeline
    return pipeline(
        "text-classification",
        model="roberta-large-mnli",
        top_k=None,
        truncation=True,
        max_length=512,
    )


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]


class HallucinationAgent(BaseAgent):
    name = AgentName.HALLUCINATION

    def __init__(
        self,
        *,
        timeout_ms: int = 5000,
        enabled: bool = True,
        entailment_threshold: float = 0.5,
        self_consistency_fn: SelfConsistencyFn | None = None,
        llm_judge_fn: LLMJudgeFn | None = None,
    ) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        self.entailment_threshold = entailment_threshold
        self.self_consistency_fn = self_consistency_fn
        self.llm_judge_fn = llm_judge_fn
        _get_nli()  # eager warmup so cold-start cost is paid outside the timeout window

    async def _self_consistency(self, output: str, retrieved_context: str) -> float:
        """Re-prompt the LLM at varied temperature, measure claim agreement.

        Default stub: delegates to the injected callable when present, otherwise
        returns a neutral 0.5. Real implementations sample multiple completions
        and measure inter-sample agreement on the asserted claim.
        """
        if self.self_consistency_fn is not None:
            return await self.self_consistency_fn(output, retrieved_context)
        return 0.5

    async def _evaluate(
        self, ctx: dict[str, Any]
    ) -> tuple[Severity, float, dict[str, Any]]:
        output = ctx.get("output", "")
        docs = ctx.get("retrieved_docs", [])
        if not output or not docs:
            return Severity.WATCH, 0.5, {"reason": "no_output_or_no_context"}

        nli = _get_nli()
        sentences = _split_sentences(output)
        context = " ".join(d.get("text", "") for d in docs)

        unsupported: list[dict[str, Any]] = []
        per_sentence_scores: list[float] = []
        for sent in sentences:
            input_text = f"{context}</s></s>{sent}"
            scores = (await asyncio.to_thread(nli, input_text))[0]
            entailment = next(s["score"] for s in scores if s["label"] == "ENTAILMENT")
            per_sentence_scores.append(entailment)
            if entailment < self.entailment_threshold:
                unsupported.append({"sentence": sent, "entailment_score": entailment})

        # NLI signal: average per-sentence entailment, default 0.9 if no sentences
        nli_score = (
            sum(per_sentence_scores) / len(per_sentence_scores)
            if per_sentence_scores
            else 0.9
        )

        # Ensemble path: only when both judges injected
        if self.self_consistency_fn is not None and self.llm_judge_fn is not None:
            sc_score = await self.self_consistency_fn(output, context)
            judge_result = await self.llm_judge_fn(output, context)
            judge_score = float(judge_result.get("factuality_score", 0.5))

            final_score = 0.5 * nli_score + 0.25 * sc_score + 0.25 * judge_score

            if final_score < 0.3:
                severity = Severity.BLOCK
            elif final_score < 0.5:
                severity = Severity.WARN
            elif final_score < 0.7:
                severity = Severity.WATCH
            else:
                severity = Severity.SAFE

            evidence = {
                "nli_score": nli_score,
                "self_consistency_score": sc_score,
                "llm_judge_score": judge_score,
                "final_score": final_score,
                "unsupported_spans": unsupported,
                "per_sentence_entailment": per_sentence_scores,
            }
            confidence = 1.0 - final_score if severity != Severity.SAFE else final_score
            return severity, confidence, evidence

        # NLI-only path: preserve Task 1.7 behavior verbatim
        if not unsupported:
            return Severity.SAFE, max(per_sentence_scores) if per_sentence_scores else 0.9, {}

        ratio = len(unsupported) / max(1, len(sentences))
        if ratio > 0.5:
            severity = Severity.BLOCK
        elif ratio > 0.2:
            severity = Severity.WARN
        else:
            severity = Severity.WATCH

        return severity, 1.0 - min(per_sentence_scores), {
            "unsupported_spans": unsupported,
            "unsupported_ratio": ratio,
            "per_sentence_entailment": per_sentence_scores,
        }

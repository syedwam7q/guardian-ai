"""Hallucination detection. Phase-1 implementation: retrieval-conditioned NLI entailment.

Phase-1 follow-up (Task 1.13) adds: self-consistency check + LLM-judge ensemble.
"""
from __future__ import annotations

import asyncio
import re
from functools import cache
from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity


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

    def __init__(self, *, timeout_ms: int = 5000, enabled: bool = True,
                 entailment_threshold: float = 0.5) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        self.entailment_threshold = entailment_threshold
        _get_nli()  # eager warmup so cold-start cost is paid outside the timeout window

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

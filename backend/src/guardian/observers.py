"""In-flight observers: capture structured trace data, no decisions."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any


@dataclass
class RetrievalObserver:
    _data: dict[str, Any] = field(default_factory=dict)

    def record(
        self,
        *,
        query_embedding: list[float],
        retrieved: list[dict[str, Any]],
        retrieval_time_ms: float,
    ) -> None:
        self._data = {
            "query_embedding_dim": len(query_embedding),
            "doc_ids": [d["doc_id"] for d in retrieved],
            "scores": [d["score"] for d in retrieved],
            "doc_texts": [d.get("text", "") for d in retrieved],
            "retrieval_time_ms": retrieval_time_ms,
        }

    def snapshot(self) -> dict[str, Any]:
        return dict(self._data)


@dataclass
class PromptObserver:
    _data: dict[str, Any] = field(default_factory=dict)

    def record(
        self,
        *,
        template_id: str,
        template_vars: dict[str, Any],
        system_prompt: str,
        final_prompt: str,
        model_params: dict[str, Any],
    ) -> None:
        h = hashlib.sha256(system_prompt.encode("utf-8")).hexdigest()[:16]
        self._data = {
            "template_id": template_id,
            "template_vars": template_vars,
            "system_prompt_hash": h,
            "final_prompt_token_count": len(final_prompt.split()),
            "final_prompt_preview": final_prompt[:200],
            "model_params": dict(model_params),
        }

    def snapshot(self) -> dict[str, Any]:
        return dict(self._data)

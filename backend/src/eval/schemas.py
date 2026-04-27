"""Common schemas for the evaluation harness."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.guardian.schemas import Severity


@dataclass
class EvalCase:
    """A single labeled evaluation case from any benchmark."""

    case_id: str
    query: str
    expected_violation_type: str | None = None  # e.g., "hallucination", "bias", "pii_leak"
    expected_violation_severity: Severity | None = None
    retrieved_context: list[str] = field(default_factory=list)
    output: str = ""  # the model's output that the agent should evaluate
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalMetrics:
    """Per-agent / per-dataset confusion-matrix metrics."""

    dataset: str
    agent: str
    n: int
    true_positive: int = 0
    false_positive: int = 0
    true_negative: int = 0
    false_negative: int = 0

    @property
    def precision(self) -> float:
        denom = self.true_positive + self.false_positive
        return self.true_positive / denom if denom else 0.0

    @property
    def recall(self) -> float:
        denom = self.true_positive + self.false_negative
        return self.true_positive / denom if denom else 0.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if (p + r) else 0.0

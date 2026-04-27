"""Result dataclasses returned by the SDK."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from src.guardian.schemas import Decision, Verdict, Violation


@dataclass(frozen=True)
class PreflightResult:
    trace_id: UUID
    blocked: bool
    verdicts: list[Verdict]
    refusal_message: str = ""
    # Context to thread into the LLM call + post-flight (sanitized input, etc).
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class PostflightResult:
    verdicts: list[Verdict]
    violations: list[Violation]
    decision: Decision | None = None


@dataclass(frozen=True)
class RemediationResult:
    text: str
    action_taken: str  # e.g., "passthrough", "redact", "block", "rewrite"
    violations_found: int

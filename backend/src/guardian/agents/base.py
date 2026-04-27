"""Base class for all governance agents."""

from __future__ import annotations

import abc
import asyncio
import logging
import time
from typing import Any

from src.guardian.schemas import AgentName, Severity, Verdict

logger = logging.getLogger(__name__)


class BaseAgent(abc.ABC):
    """Abstract base for governance agents.

    Subclasses implement ``_evaluate(ctx) -> (Severity, confidence, evidence)``.
    The ``evaluate`` wrapper handles timing, timeout, and exception isolation
    so a single misbehaving agent never crashes the pipeline.
    """

    name: AgentName  # subclass MUST set as a class attribute

    def __init__(self, *, timeout_ms: int = 500, enabled: bool = True) -> None:
        if not hasattr(self, "name") or self.name is None:
            raise TypeError(f"{type(self).__name__} must set class attribute `name`")
        self.timeout_ms = timeout_ms
        self.enabled = enabled

    @abc.abstractmethod
    async def _evaluate(self, ctx: dict[str, Any]) -> tuple[Severity, float, dict[str, Any]]:
        """Subclass hook. Return ``(severity, confidence, evidence)``."""

    async def evaluate(self, ctx: dict[str, Any]) -> Verdict:
        if not self.enabled:
            return Verdict(
                agent=self.name,
                severity=Severity.SAFE,
                confidence=1.0,
                latency_ms=0.0,
            )
        start = time.perf_counter()
        try:
            severity, confidence, evidence = await asyncio.wait_for(
                self._evaluate(ctx), timeout=self.timeout_ms / 1000
            )
        except TimeoutError:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.warning("agent.timeout", extra={"agent": self.name.value, "ms": elapsed_ms})
            return Verdict(
                agent=self.name,
                severity=Severity.WATCH,
                confidence=0.5,
                evidence={"timeout": True, "limit_ms": self.timeout_ms},
                latency_ms=elapsed_ms,
            )
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception("agent.error", extra={"agent": self.name.value})
            return Verdict(
                agent=self.name,
                severity=Severity.WATCH,
                confidence=0.0,
                evidence={"error": str(exc), "type": type(exc).__name__},
                latency_ms=elapsed_ms,
            )

        elapsed_ms = (time.perf_counter() - start) * 1000
        return Verdict(
            agent=self.name,
            severity=severity,
            confidence=confidence,
            evidence=evidence,
            latency_ms=elapsed_ms,
        )

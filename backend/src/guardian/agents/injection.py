"""Prompt-injection detection agent.

Hybrid: rule-pattern matching (fast path) + Llama-Guard-3-1B classifier (high-recall path).
For Phase 1 we ship the rule path only; classifier upgrade is a Phase 1 follow-up.
"""
from __future__ import annotations

import re
from typing import Any

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity

# Patterns drawn from AdvBench, Lakera Gandalf, Garak corpora (sanitized for distribution).
_INJECTION_PATTERNS = [
    r"\bignore\b.{0,40}\b(previous|prior|above|all)\b.{0,40}\b(instructions?|context|prompt)\b",
    r"\bdisregard\b.{0,40}\b(above|prior|previous)\b",
    r"\bsystem\s*prompt\b.{0,30}\b(reveal|show|tell|print|output)\b",
    r"<<\s*SYS\s*>>|<<\s*/?SYS\s*>>",
    r"\[\s*INST\s*\]",
    r"\bjailbreak\b",
    r"\byou\s+are\s+now\s+(DAN|developer mode|unrestricted)",
    r"\b(forget|abandon)\b.{0,40}\b(rules?|guidelines?|safety)\b",
    r"override\b.{0,40}\b(prior|previous|context|system)\b",
]
_COMPILED = [re.compile(p, re.IGNORECASE | re.DOTALL) for p in _INJECTION_PATTERNS]

# Common benign phrases that previously caused false positives — reduce score on match.
_BENIGN_HEDGES = re.compile(
    r"\b(please|kindly|thank you|appreciate|recommend|suggest|advise|guideline)\b", re.I
)


class PromptInjectionAgent(BaseAgent):
    name = AgentName.PROMPT_INJECTION

    async def _evaluate(
        self, ctx: dict[str, Any]
    ) -> tuple[Severity, float, dict[str, Any]]:
        text = ctx.get("user_input", "")
        if not text:
            return Severity.SAFE, 1.0, {}

        matches = [p.pattern for p in _COMPILED if p.search(text)]
        benign_signal = bool(_BENIGN_HEDGES.search(text))

        if not matches:
            return Severity.SAFE, 0.95, {}

        score = min(1.0, 0.4 + 0.3 * len(matches))
        if benign_signal and len(matches) == 1:
            score = max(0.0, score - 0.2)

        if score >= 0.8:
            severity = Severity.BLOCK
        elif score >= 0.55:
            severity = Severity.WARN
        else:
            severity = Severity.WATCH

        return severity, score, {"patterns": matches, "benign_hedge": benign_signal}

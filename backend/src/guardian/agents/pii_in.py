"""PII detection (input side) using Microsoft Presidio + India recognizers."""
from __future__ import annotations

from functools import cache
from typing import Any

from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity


def _build_aadhaar_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="AADHAAR",
        patterns=[
            Pattern(
                name="aadhaar_12_digit",
                regex=r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
                score=0.85,
            )
        ],
        context=["aadhaar", "uid", "uidai", "biometric"],
    )


def _build_pan_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="PAN",
        patterns=[
            Pattern(name="pan", regex=r"\b[A-Z]{5}\d{4}[A-Z]\b", score=0.9)
        ],
        context=["pan", "permanent account", "income tax"],
    )


@cache
def _get_engines() -> tuple[AnalyzerEngine, AnonymizerEngine]:
    analyzer = AnalyzerEngine()
    analyzer.registry.add_recognizer(_build_aadhaar_recognizer())
    analyzer.registry.add_recognizer(_build_pan_recognizer())
    return analyzer, AnonymizerEngine()


_ENTITY_SEVERITY = {
    "AADHAAR": Severity.BLOCK,
    "PAN": Severity.BLOCK,
    "CREDIT_CARD": Severity.BLOCK,
    "US_SSN": Severity.BLOCK,
    "EMAIL_ADDRESS": Severity.WARN,
    "PHONE_NUMBER": Severity.WARN,
    "IP_ADDRESS": Severity.WATCH,
    "PERSON": Severity.WATCH,
    "DATE_TIME": Severity.WATCH,
    "LOCATION": Severity.WATCH,
}


class PIIInAgent(BaseAgent):
    name = AgentName.PII_IN

    def __init__(self, *, timeout_ms: int = 300, enabled: bool = True, strict: bool = False) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        self.strict = strict

    async def _evaluate(
        self, ctx: dict[str, Any]
    ) -> tuple[Severity, float, dict[str, Any]]:
        text = ctx.get("user_input", "")
        if not text:
            return Severity.SAFE, 1.0, {}

        analyzer, anonymizer = _get_engines()
        results = analyzer.analyze(text=text, language="en")

        if not results:
            return Severity.SAFE, 0.98, {}

        entities: dict[str, list[dict[str, Any]]] = {}
        max_severity = Severity.SAFE
        for r in results:
            entities.setdefault(r.entity_type, []).append(
                {"start": r.start, "end": r.end, "score": r.score, "text": text[r.start : r.end]}
            )
            sev = _ENTITY_SEVERITY.get(r.entity_type, Severity.WATCH)
            if sev > max_severity:
                max_severity = sev

        # Redact PII
        anonymized = anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators={
                ent: OperatorConfig("replace", {"new_value": f"<{ent}>"})
                for ent in entities
            },
        )

        confidence = max(r.score for r in results)
        if self.strict and max_severity >= Severity.WARN:
            max_severity = Severity.BLOCK

        return (
            max_severity,
            confidence,
            {"entities": entities, "redacted_text": anonymized.text},
        )

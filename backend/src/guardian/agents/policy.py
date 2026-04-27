"""Declarative YAML policy enforcement."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from src.guardian.agents.base import BaseAgent
from src.guardian.schemas import AgentName, Severity

_SEVERITY_MAP = {
    "safe": Severity.SAFE,
    "watch": Severity.WATCH,
    "warn": Severity.WARN,
    "block": Severity.BLOCK,
}


class PolicyAgent(BaseAgent):
    name = AgentName.POLICY

    def __init__(self, *, policy_path: str, timeout_ms: int = 100, enabled: bool = True) -> None:
        super().__init__(timeout_ms=timeout_ms, enabled=enabled)
        self._rules = self._load(policy_path)

    @staticmethod
    def _load(path: str) -> list[dict[str, Any]]:
        data = yaml.safe_load(Path(path).read_text())
        rules = []
        for rule in data.get("rules", []):
            compiled = {
                "id": rule["id"],
                "description": rule.get("description", ""),
                "action": rule["action"],
                "severity": _SEVERITY_MAP[rule["severity"]],
            }
            triggers = rule["triggers"]
            if "any_of" in triggers:
                compiled["any_of"] = [re.compile(t["regex"], re.I) for t in triggers["any_of"]]
            if "all_of" in triggers:
                compiled["all_of"] = [re.compile(t["regex"], re.I) for t in triggers["all_of"]]
            for k in ("disclaimer", "refusal"):
                if k in rule:
                    compiled[k] = rule[k]
            rules.append(compiled)
        return rules

    async def _evaluate(
        self, ctx: dict[str, Any]
    ) -> tuple[Severity, float, dict[str, Any]]:
        text = ctx.get("user_input", "")
        if not text:
            return Severity.SAFE, 1.0, {}

        triggered = []
        max_sev = Severity.SAFE
        for rule in self._rules:
            any_hit = (
                any(p.search(text) for p in rule["any_of"]) if "any_of" in rule else False
            )
            all_hit = (
                all(p.search(text) for p in rule["all_of"]) if "all_of" in rule else False
            )
            if any_hit or all_hit:
                t = {
                    "id": rule["id"],
                    "description": rule["description"],
                    "action": rule["action"],
                    "severity": rule["severity"].name,
                }
                if "disclaimer" in rule:
                    t["disclaimer"] = rule["disclaimer"]
                if "refusal" in rule:
                    t["refusal"] = rule["refusal"]
                triggered.append(t)
                if rule["severity"] > max_sev:
                    max_sev = rule["severity"]

        if not triggered:
            return Severity.SAFE, 0.98, {}
        return max_sev, 0.95, {"triggered_rules": triggered}

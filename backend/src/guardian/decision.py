"""Constraint-based decision engine — no Q-learning, no fake negotiation."""
from __future__ import annotations

from typing import Any

from src.guardian.schemas import Action, AgentName, Decision, Severity, Violation

# Hard-rule mapping: (agent, severity) → required action class.
_HARD_RULES: dict[tuple[AgentName, Severity], Action] = {
    (AgentName.PROMPT_INJECTION, Severity.BLOCK): Action.BLOCK,
    (AgentName.PII_IN, Severity.BLOCK): Action.REDACT,
    (AgentName.POLICY, Severity.BLOCK): Action.BLOCK,
    (AgentName.PII_OUT, Severity.BLOCK): Action.REDACT,
}

# Soft mapping for non-block: ranked candidate actions per agent.
_SOFT_CANDIDATES: dict[AgentName, list[Action]] = {
    AgentName.HALLUCINATION: [Action.REGENERATE_WITH_CONTEXT, Action.REWRITE, Action.ALERT],
    AgentName.BIAS: [Action.REWRITE, Action.ALERT],
    AgentName.PII_OUT: [Action.REDACT, Action.ALERT],
    AgentName.COST: [Action.FALLBACK_MODEL, Action.ALERT],
    AgentName.POLICY: [Action.ADD_DISCLAIMER, Action.ALERT],
    AgentName.PII_IN: [Action.REDACT, Action.ALERT],
    AgentName.PROMPT_INJECTION: [Action.ALERT_AND_PROCEED, Action.ALERT],
}


class DecisionEngine:
    async def decide(
        self,
        *,
        violations: list[Violation],
        causal_attribution: list[dict[str, Any]],
        similar_past: list[dict[str, Any]],
    ) -> Decision:
        if not violations:
            return Decision(
                action=Action.LOG,
                rationale="No violations detected; logging trace for audit.",
                alternatives_considered=[{"action": Action.LOG, "score": 1.0}],
                expected_outcome="Trace persisted for future analysis.",
                confidence=0.99,
                causal_attribution=causal_attribution,
            )

        # Find the highest-severity violation.
        worst = max(violations, key=lambda v: v.severity)

        # Hard rule path.
        hard_key = (worst.agent, worst.severity)
        if hard_key in _HARD_RULES:
            chosen = _HARD_RULES[hard_key]
            alts = [
                {"action": a.value, "score": 0.4}
                for a in _SOFT_CANDIDATES.get(worst.agent, []) if a != chosen
            ]
            if not alts:
                alts = [{"action": Action.ALERT.value, "score": 0.3}]
            return Decision(
                action=chosen,
                rationale=f"Hard rule: {worst.agent.value} severity={worst.severity.name} → {chosen.value}",
                alternatives_considered=alts,
                expected_outcome=self._expected_outcome(chosen, worst),
                confidence=worst.confidence,
                causal_attribution=causal_attribution,
            )

        # Soft path: pick top candidate, score alternatives by utility.
        candidates = _SOFT_CANDIDATES.get(worst.agent, [Action.ALERT])
        scores: dict[Action, float] = {a: 1.0 - 0.1 * i for i, a in enumerate(candidates)}

        # Bias toward actions used successfully in similar past cases.
        for past in similar_past:
            past_action = past.get("action")
            past_outcome = past.get("outcome_score", 0.0)
            for a in scores:
                if a.value == past_action:
                    scores[a] = min(1.0, scores[a] + 0.1 * past_outcome)

        chosen = max(scores, key=scores.get)
        alts_list = [{"action": a.value, "score": s} for a, s in scores.items() if a != chosen]
        return Decision(
            action=chosen,
            rationale=f"Soft selection for {worst.agent.value}@{worst.severity.name}; "
                      f"informed by {len(similar_past)} prior similar case(s).",
            alternatives_considered=alts_list,
            expected_outcome=self._expected_outcome(chosen, worst),
            confidence=scores[chosen] * worst.confidence,
            causal_attribution=causal_attribution,
        )

    @staticmethod
    def _expected_outcome(action: Action, v: Violation) -> str:
        return {
            Action.BLOCK: "Adversarial input neutralized; user receives refusal explanation.",
            Action.REWRITE: f"Output edited to remove flagged content from {v.agent.value}.",
            Action.REDACT: "PII redacted before delivery.",
            Action.REGENERATE_WITH_CONTEXT: "Output regenerated with stricter grounding.",
            Action.FALLBACK_MODEL: "Next request routed to cheaper/faster model.",
            Action.ADD_DISCLAIMER: "Required disclaimer prepended.",
            Action.ALERT: "Operator notified; user-visible response unchanged.",
            Action.ALERT_AND_PROCEED: "Operator notified; request proceeds.",
            Action.LOG: "Trace logged.",
        }[action]

"""Agent that produces human-readable clinical reasoning."""

from typing import Any

from app.services.explanation_service import generate_explanations
from app.services.risk_service import get_recommendation, get_risk_level


class ReasoningAgent:
    """Combines rule-based explanations with risk-tier recommendations."""

    name = "ReasoningAgent"

    def run(
        self,
        patient: dict[str, Any],
        sepsis_probability: float,
        monitoring_result: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        explanations = generate_explanations(patient)
        risk_level = get_risk_level(sepsis_probability)
        recommendation = get_recommendation(risk_level)

        # Enrich explanations with monitoring flags when rules did not fire
        if monitoring_result and monitoring_result.get("flags"):
            existing = " ".join(explanations).lower()
            for flag in monitoring_result["flags"]:
                if flag.replace("_", " ") not in existing:
                    explanations.append(
                        f"Monitoring agent flagged: {flag.replace('_', ' ')}."
                    )

        return {
            "agent": self.name,
            "risk_level": risk_level,
            "explanation": explanations,
            "recommendation": recommendation,
        }

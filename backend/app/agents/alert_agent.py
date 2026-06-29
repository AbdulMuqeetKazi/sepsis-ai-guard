"""Agent that decides whether a clinical alert should be raised."""

from typing import Any

from app.core.config import get_settings
from app.services.risk_service import should_escalate


class AlertAgent:
    """Creates alerts for high/critical risk predictions."""

    name = "AlertAgent"

    def run(
        self,
        sepsis_probability: float,
        risk_level: str,
        patient_id: str | None = None,
    ) -> dict[str, Any]:
        settings = get_settings()
        escalate = should_escalate(risk_level) or (
            sepsis_probability >= settings.alert_probability_threshold
        )

        if not escalate:
            return {
                "agent": self.name,
                "alert_required": False,
                "message": "No alert required at current risk level.",
            }

        severity = "critical" if risk_level == "Critical Risk" else "high"
        message = (
            f"Sepsis risk alert ({risk_level}): probability {sepsis_probability:.2%}. "
            "Clinical review recommended."
        )

        return {
            "agent": self.name,
            "alert_required": True,
            "severity": severity,
            "risk_level": risk_level,
            "sepsis_probability": sepsis_probability,
            "patient_id": patient_id,
            "message": message,
        }

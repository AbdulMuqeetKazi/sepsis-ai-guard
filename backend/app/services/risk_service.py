"""Risk level classification and safe clinical recommendations."""

from app.utils.helpers import safe_round

RISK_LEVELS = {
    "low": "Low Risk",
    "medium": "Medium Risk",
    "high": "High Risk",
    "critical": "Critical Risk",
}

RECOMMENDATIONS = {
    "Low Risk": (
        "Continue routine monitoring. No immediate escalation required based on "
        "current risk assessment."
    ),
    "Medium Risk": (
        "Repeat vitals and arrange a clinical review. Increased observation is "
        "recommended."
    ),
    "High Risk": (
        "Urgent doctor review recommended. Escalate monitoring and reassess "
        "clinical status promptly."
    ),
    "Critical Risk": (
        "Immediate clinical attention recommended. Notify the responsible clinical "
        "team without delay."
    ),
}


def get_risk_level(probability: float) -> str:
    """
    Map sepsis probability to a risk tier.

    0.00–0.30  → Low Risk
    0.31–0.60  → Medium Risk
    0.61–0.80  → High Risk
    0.81–1.00  → Critical Risk
    """
    p = safe_round(probability)
    if p <= 0.30:
        return RISK_LEVELS["low"]
    if p <= 0.60:
        return RISK_LEVELS["medium"]
    if p <= 0.80:
        return RISK_LEVELS["high"]
    return RISK_LEVELS["critical"]


def get_recommendation(risk_level: str) -> str:
    """Return safe, non-prescriptive monitoring guidance for the risk tier."""
    return RECOMMENDATIONS.get(
        risk_level,
        "Continue clinical assessment and monitoring as per local protocol.",
    )


def should_escalate(risk_level: str) -> bool:
    """Whether the risk level warrants escalation (High or Critical)."""
    return risk_level in (RISK_LEVELS["high"], RISK_LEVELS["critical"])
